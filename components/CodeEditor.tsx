'use client';

import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { apiClient } from '@/lib/api-client';
import LogsPanel, { LogEntry } from '@/components/LogsPanel';
import { logger } from '@/lib/logger';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  content?: string;
}

interface CodeEditorProps {
  projectId: string | null;
  fileTree: FileNode[];
  onFileSelect: (path: string) => void;
  onFileUpdate?: (path: string, content: string) => void;
  onFileChange?: () => void;
}

export default function CodeEditor({ projectId, fileTree, onFileSelect, onFileUpdate, onFileChange }: CodeEditorProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<'file' | 'folder'>('file');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(200);
  const [terminalLogs, setTerminalLogs] = useState<Array<{type: 'info' | 'error' | 'success' | 'warning', message: string, timestamp: Date}>>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [viewMode, setViewMode] = useState<'files' | 'logs'>('files');
  const [appLogs, setAppLogs] = useState<LogEntry[]>([]);
  const editorRef = useRef<any>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-expand folders and select main file when project loads
  useEffect(() => {
    if (fileTree.length > 0 && !selectedFile) {
      // Expand all folders by default
      const allFolders = new Set<string>();
      const collectFolders = (nodes: FileNode[]) => {
        nodes.forEach(node => {
          if (node.type === 'folder') {
            allFolders.add(node.path);
            if (node.children) {
              collectFolders(node.children);
            }
          }
        });
      };
      collectFolders(fileTree);
      setExpandedFolders(allFolders);

      // Auto-select the main app file
      const findMainFile = (nodes: FileNode[]): FileNode | null => {
        // Priority: App.tsx > App.js > index.tsx > index.js > first .tsx/.js file
        const priorities = ['App.tsx', 'App.js', 'index.tsx', 'index.js', '_layout.tsx'];
        
        for (const priority of priorities) {
          for (const node of nodes) {
            if (node.type === 'file' && node.name === priority) {
              return node;
            }
            if (node.type === 'folder' && node.children) {
              const found = findMainFile(node.children);
              if (found) return found;
            }
          }
        }

        // Fallback: find first .tsx or .js file
        for (const node of nodes) {
          if (node.type === 'file' && (node.name.endsWith('.tsx') || node.name.endsWith('.js') || node.name.endsWith('.ts'))) {
            return node;
          }
          if (node.type === 'folder' && node.children) {
            const found = findMainFile(node.children);
            if (found) return found;
          }
        }

        return null;
      };

      const mainFile = findMainFile(fileTree);
      if (mainFile) {
        setSelectedFile(mainFile.path);
        setFileContent(mainFile.content || '// No content available');
        onFileSelect(mainFile.path);
      }
    }
  }, [fileTree, projectId]);

  // Fetch project logs and status
  useEffect(() => {
    if (!projectId) return;

    // Add initial log
    setTerminalLogs([{
      type: 'info' as const,
      message: `✓ Project ${projectId} loaded successfully`,
      timestamp: new Date()
    }, {
      type: 'info' as const,
      message: `📁 File explorer ready - ${fileTree.length} items`,
      timestamp: new Date()
    }]);

    // Poll for project status every 15 seconds
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/project-status/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          
          // Only add status log if status changed or has useful info
          if (data.status && (data.port || data.url)) {
            setTerminalLogs(prev => {
              // Check if last log is similar to avoid spam
              const lastLog = prev[prev.length - 1];
              const newMessage = `Status: ${data.status}${data.port ? ` | Port: ${data.port}` : ''}${data.url ? ` | URL: ${data.url}` : ''}`;
              
              if (!lastLog || !lastLog.message.includes(newMessage)) {
                return [...prev, {
                  type: (data.status === 'ready' ? 'success' : 'info') as 'success' | 'info',
                  message: newMessage,
                  timestamp: new Date()
                }].slice(-50); // Keep last 50 logs
              }
              return prev;
            });
          }
        }
      } catch (error) {
        // Silently ignore errors
      }
    }, 15000);

    return () => clearInterval(pollInterval);
  }, [projectId, fileTree.length]);

  // Auto-scroll terminal to bottom when new logs arrive
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  const toggleFolder = (path: string) => {
    logger.buttonClick('Toggle Folder', { path });
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileClick = (file: FileNode) => {
    if (file.type === 'file') {
      setSelectedFile(file.path);
      setFileContent(file.content || '// No content available');
      setHasUnsavedChanges(false);
      
      // Add to open tabs if not already there
      if (!openTabs.includes(file.path)) {
        setOpenTabs([...openTabs, file.path]);
      }
      
      onFileSelect(file.path);
    } else {
      toggleFolder(file.path);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && value !== fileContent) {
      setFileContent(value);
      setHasUnsavedChanges(true);
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile || !projectId) return;
    
    setTerminalLogs(prev => [...prev, {
      type: 'info' as const,
      message: `Saving ${selectedFile}...`,
      timestamp: new Date()
    }]);
    
    try {
      await apiClient.updateFile(projectId, selectedFile, fileContent);
      
      setHasUnsavedChanges(false);
      onFileUpdate?.(selectedFile, fileContent);
      setTerminalLogs(prev => [...prev, {
        type: 'success' as const,
        message: `✓ Saved ${selectedFile}`,
        timestamp: new Date()
      }]);
    } catch (error: any) {
      console.error('Failed to save file:', error);
      setTerminalLogs(prev => [...prev, {
        type: 'error' as const,
        message: `Error saving ${selectedFile}: ${error.message || error}`,
        timestamp: new Date()
      }]);
    }
  };

  const handleNewFile = async () => {
    if (!projectId || !newFileName.trim()) return;
    
    try {
      await apiClient.createFile(projectId, {
        path: newFileName,
        type: newFileType,
        content: newFileType === 'file' ? '' : undefined
      });
      
      setShowNewFileDialog(false);
      setNewFileName('');
      // Trigger refresh
      onFileChange?.();
    } catch (error: any) {
      console.error('Failed to create file:', error);
      setTerminalLogs(prev => [...prev, {
        type: 'error' as const,
        message: `Failed to create ${newFileName}: ${error.message || error}`,
        timestamp: new Date()
      }]);
    }
  };

  const handleDeleteFile = async (path: string) => {
    if (!projectId || !confirm(`Delete ${path}?`)) return;
    
    try {
      await apiClient.deleteFile(projectId, path);
      
      // Remove from tabs
      setOpenTabs(openTabs.filter(t => t !== path));
      if (selectedFile === path) {
        setSelectedFile(null);
      }
      // Trigger refresh
      onFileChange?.();
      
      setTerminalLogs(prev => [...prev, {
        type: 'success' as const,
        message: `✓ Deleted ${path}`,
        timestamp: new Date()
      }]);
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      setTerminalLogs(prev => [...prev, {
        type: 'error' as const,
        message: `Failed to delete ${path}: ${error.message || error}`,
        timestamp: new Date()
      }]);
    }
  };

  const handleRenameFile = async () => {
    if (!projectId || !renameTarget || !renameValue.trim()) return;
    
    try {
      await apiClient.renameFile(projectId, renameTarget, renameValue.trim());
      
      setRenameTarget(null);
      setRenameValue('');
      // Trigger refresh
      onFileChange?.();
      
      setTerminalLogs(prev => [...prev, {
        type: 'success' as const,
        message: `✓ Renamed ${renameTarget} to ${renameValue.trim()}`,
        timestamp: new Date()
      }]);
    } catch (error: any) {
      console.error('Failed to rename file:', error);
      setTerminalLogs(prev => [...prev, {
        type: 'error' as const,
        message: `Failed to rename ${renameTarget}: ${error.message || error}`,
        timestamp: new Date()
      }]);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, path });
  };

  const closeTab = (path: string) => {
    setOpenTabs(openTabs.filter(t => t !== path));
    if (selectedFile === path && openTabs.length > 1) {
      const index = openTabs.indexOf(path);
      const nextTab = openTabs[index + 1] || openTabs[index - 1];
      if (nextTab) {
        const file = findFileByPath(fileTree, nextTab);
        if (file) handleFileClick(file);
      }
    } else if (selectedFile === path) {
      setSelectedFile(null);
    }
  };

  const findFileByPath = (nodes: FileNode[], path: string): FileNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findFileByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveFile();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, fileContent]);

  const isImageFile = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext || '');
  };

  const getImageUrl = (filePath: string) => {
    if (!projectId) return '';
    // Construct URL to serve the image from backend
    return `/api/files/${projectId}/${filePath}`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'tsx':
      case 'jsx':
        return '⚛️';
      case 'ts':
      case 'js':
        return '📜';
      case 'json':
        return '📋';
      case 'md':
        return '📝';
      case 'css':
      case 'scss':
        return '🎨';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
      case 'bmp':
      case 'ico':
        return '🖼️';
      default:
        return '📄';
    }
  };

  const renderFileTree = (nodes: FileNode[], level: number = 0) => {
    // Sort: folders first (alphabetically), then files (alphabetically)
    const sortedNodes = [...nodes].sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === 'folder' ? -1 : 1;
    });
    
    return sortedNodes.map((node) => (
      <div key={node.path}>
        {renameTarget === node.path ? (
          <div className="flex items-center px-2 py-1" style={{ paddingLeft: `${level * 12 + 8}px` }}>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameFile();
                if (e.key === 'Escape') setRenameTarget(null);
              }}
              onBlur={handleRenameFile}
              autoFocus
              className="flex-1 bg-gray-800 text-white px-2 py-1 text-sm rounded"
            />
          </div>
        ) : (
          <div
            className={`flex items-center px-2 py-1.5 hover:bg-gray-900/80 cursor-pointer transition-all ${
              selectedFile === node.path ? 'bg-gradient-to-r from-orange-500/30 to-yellow-500/20 border-l-4 border-orange-500 shadow-md' : ''
            }`}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={() => handleFileClick(node)}
            onContextMenu={(e) => handleContextMenu(e, node.path)}
          >
            {node.type === 'folder' ? (
              <>
                <svg
                  className={`h-4 w-4 mr-1 text-yellow-400 transition-transform ${
                    expandedFolders.has(node.path) ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <svg className="h-4 w-4 mr-2 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
              </>
            ) : (
              <>
                <span className="w-4 mr-1"></span>
                <span className="mr-2 text-base">{getFileIcon(node.name)}</span>
              </>
            )}
            <span className="text-sm truncate text-gray-300">{node.name}</span>
          </div>
        )}
        {node.type === 'folder' && expandedFolders.has(node.path) && node.children && (
          <div>{renderFileTree(node.children, level + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      {/* Header with gradient */}
      <div className="p-3 border-b-2 border-orange-500/40 bg-gradient-to-r from-black via-gray-900 to-black shadow-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-orange-500 to-yellow-500 p-2 rounded-lg shadow-md">
            <svg className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Code Editor</h2>
        </div>
        <div className="flex items-center gap-2">
          {projectId && fileTree.length > 0 && (
            <>
              <button
                onClick={() => setShowNewFileDialog(true)}
                className="p-1 hover:bg-gray-800 rounded text-orange-400"
                title="New File"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <span className="text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded">
                {(() => {
                  let fileCount = 0;
                  const countFiles = (nodes: FileNode[]) => {
                    nodes.forEach(node => {
                      if (node.type === 'file') fileCount++;
                      if (node.children) countFiles(node.children);
                    });
                  };
                  countFiles(fileTree);
                  return `${fileCount} files`;
                })()}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* File Tree with improved styling */}
        <div 
          className={`border-r-2 border-orange-500/30 overflow-y-auto bg-gradient-to-b from-black via-gray-950 to-black shadow-inner transition-all duration-300 ${
            isSidebarCollapsed ? 'w-0' : 'w-64'
          }`}
        >
          {fileTree.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              <div className="bg-gray-900 rounded-full p-3 w-14 h-14 mx-auto mb-2 flex items-center justify-center">
                <svg className="h-7 w-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <p className="text-gray-400">No project loaded</p>
            </div>
          ) : (
            <div className="py-2">{renderFileTree(fileTree)}</div>
          )}
        </div>

        {/* Collapse/Expand Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800 hover:bg-gray-700 border border-orange-500/40 rounded-r-lg p-1.5 transition-all shadow-lg"
          style={{ left: isSidebarCollapsed ? '0' : '256px' }}
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg 
            className={`h-4 w-4 text-orange-400 transition-transform ${isSidebarCollapsed ? '' : 'rotate-180'}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Code View with improved styling */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-gray-900 via-gray-900 to-black">
          {/* View Mode Toggle */}
          <div className="flex items-center border-b-2 border-orange-500/40 bg-gradient-to-r from-black via-gray-900 to-black shadow-md">
            <button
              onClick={() => {
                setViewMode('files');
                logger.buttonClick('View Mode: Files');
              }}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                viewMode === 'files'
                  ? 'bg-gradient-to-b from-gray-800 to-gray-900 text-white border-t-2 border-t-orange-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              📁 Files
            </button>
            <button
              onClick={() => {
                setViewMode('logs');
                logger.buttonClick('View Mode: Logs');
              }}
              className={`px-4 py-2 text-sm font-medium transition-all border-l border-orange-500/30 ${
                viewMode === 'logs'
                  ? 'bg-gradient-to-b from-gray-800 to-gray-900 text-white border-t-2 border-t-orange-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              📋 Logs
            </button>
          </div>

          {viewMode === 'logs' ? (
            <LogsPanel 
              logs={appLogs} 
              onClear={() => {
                logger.clear();
                setAppLogs([]);
              }}
              projectId={projectId}
              showBackendLogs={!!projectId}
            />
          ) : selectedFile ? (
            <>
              {/* File Tabs with improved styling */}
              <div className="flex items-center border-b-2 border-orange-500/40 bg-gradient-to-r from-black via-gray-900 to-black overflow-x-auto shadow-md">
                {openTabs.map((tab) => (
                  <div
                    key={tab}
                    className={`flex items-center gap-2 px-4 py-2.5 border-r border-orange-500/30 cursor-pointer group transition-all ${
                      selectedFile === tab 
                        ? 'bg-gradient-to-b from-gray-800 to-gray-900 text-white border-t-2 border-t-orange-500 shadow-lg' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                    onClick={() => {
                      const file = findFileByPath(fileTree, tab);
                      if (file) handleFileClick(file);
                    }}
                  >
                    <span className="text-sm">{getFileIcon(tab.split('/').pop() || '')}</span>
                    <span className="text-xs">{tab.split('/').pop()}</span>
                    {selectedFile === tab && hasUnsavedChanges && (
                      <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-400"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Editor Toolbar with improved styling */}
              <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-black via-gray-900 to-black border-b-2 border-orange-500/40 shadow-md">
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <svg className="h-3 w-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium">{selectedFile}</span>
                  {hasUnsavedChanges && (
                    <span className="flex items-center gap-1 text-orange-400 font-semibold">
                      <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
                      Modified
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSaveFile}
                  disabled={!hasUnsavedChanges}
                  className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-yellow-500 text-black text-xs font-bold rounded-lg hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  💾 Save (Ctrl+S)
                </button>
              </div>

              {/* Content Area - Monaco Editor or Image Viewer */}
              <div className="flex-1 overflow-hidden" style={{ height: showTerminal ? `calc(100% - ${terminalHeight}px)` : '100%' }}>
                {selectedFile && isImageFile(selectedFile) ? (
                  /* Image Viewer */
                  <div className="h-full w-full flex items-center justify-center bg-gray-900 p-8 overflow-auto">
                    <div className="max-w-full max-h-full flex flex-col items-center gap-4">
                      <img
                        src={getImageUrl(selectedFile)}
                        alt={selectedFile.split('/').pop()}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border-2 border-orange-500/30"
                        style={{ maxHeight: 'calc(100vh - 300px)' }}
                      />
                      <div className="text-center">
                        <p className="text-sm text-gray-400">
                          {selectedFile.split('/').pop()}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Image preview • Click to open in new tab
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={getImageUrl(selectedFile)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-all"
                        >
                          Open in New Tab
                        </a>
                        <a
                          href={getImageUrl(selectedFile)}
                          download={selectedFile.split('/').pop()}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-all"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Monaco Editor for code files */
                  <Editor
                    height="100%"
                    defaultLanguage={getLanguage(selectedFile)}
                    value={fileContent}
                    onChange={handleEditorChange}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      wordWrap: 'on',
                      formatOnPaste: true,
                      formatOnType: true,
                    }}
                    beforeMount={(monaco) => {
                      // Completely disable all syntax error markers and validation
                      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                        noSemanticValidation: true,
                        noSyntaxValidation: true,
                        noSuggestionDiagnostics: true,
                        diagnosticCodesToIgnore: [1005, 1006, 1109, 1128, 1160, 1161, 1434, 2304, 2307, 2322, 2339, 2345, 2552, 2554, 2555, 2556, 2571, 2580, 2581, 2582, 2583, 2584, 2585, 2586, 2587, 2588, 2589, 2590, 2591, 2592, 2593, 2594, 2595, 2596, 2597, 2598, 2599, 2600, 2601, 2602, 2603, 2604, 2605, 2606, 2607, 2608, 2609, 2610, 2611, 2612, 2613, 2614, 2615, 2616, 2617, 2618, 2619, 2620, 2621, 2622, 2623, 2624, 2625, 2626, 2627, 2628, 2629, 2630, 2631, 2632, 2633, 2634, 2635, 2636, 2637, 2638, 2639, 2640, 2641, 2642, 2643, 2644, 2645, 2646, 2647, 2648, 2649, 2650, 2651, 2652, 2653, 2654, 2655, 2656, 2657, 2658, 2659, 2660, 2661, 2662, 2663, 2664, 2665, 2666, 2667, 2668, 2669, 2670, 2671, 2672, 2673, 2674, 2675, 2676, 2677, 2678, 2679, 2680, 2681, 2682, 2683, 2684, 2685, 2686, 2687, 2688, 2689, 2690, 2691, 2692, 2693, 2694, 2695, 2696, 2697, 2698, 2699, 2700, 2701, 2702, 2703, 2704, 2705, 2706, 2707, 2708, 2709, 2710, 2711, 2712, 2713, 2714, 2715, 2716, 2717, 2718, 2719, 2720, 2721, 2722, 2723, 2724, 2725, 2726, 2727, 2728, 2729, 2730, 2731, 2732, 2733, 2734, 2735, 2736, 2737, 2738, 2739, 2740, 2741, 2742, 2743, 2744, 2745, 2746, 2747, 2748, 2749, 2750, 2751, 2752, 2753, 2754, 2755, 2756, 2757, 2758, 2759, 2760, 2761, 2762, 2763, 2764, 2765, 2766, 2767, 2768, 2769, 2770, 2771, 2772, 2773, 2774, 2775, 2776, 2777, 2778, 2779, 2780, 2781, 2782, 2783, 2784, 2785, 2786, 2787, 2788, 2789, 2790, 2791, 2792, 2793, 2794, 2795, 2796, 2797, 2798, 2799, 2800],
                      });
                      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                        noSemanticValidation: true,
                        noSyntaxValidation: true,
                        noSuggestionDiagnostics: true,
                        diagnosticCodesToIgnore: [1005, 1006, 1109, 1128, 1160, 1161, 1434, 2304, 2307, 2322, 2339, 2345, 2552, 2554, 2555, 2556, 2571, 2580, 2581, 2582, 2583, 2584, 2585, 2586, 2587, 2588, 2589, 2590, 2591, 2592, 2593, 2594, 2595, 2596, 2597, 2598, 2599, 2600, 2601, 2602, 2603, 2604, 2605, 2606, 2607, 2608, 2609, 2610, 2611, 2612, 2613, 2614, 2615, 2616, 2617, 2618, 2619, 2620, 2621, 2622, 2623, 2624, 2625, 2626, 2627, 2628, 2629, 2630, 2631, 2632, 2633, 2634, 2635, 2636, 2637, 2638, 2639, 2640, 2641, 2642, 2643, 2644, 2645, 2646, 2647, 2648, 2649, 2650, 2651, 2652, 2653, 2654, 2655, 2656, 2657, 2658, 2659, 2660, 2661, 2662, 2663, 2664, 2665, 2666, 2667, 2668, 2669, 2670, 2671, 2672, 2673, 2674, 2675, 2676, 2677, 2678, 2679, 2680, 2681, 2682, 2683, 2684, 2685, 2686, 2687, 2688, 2689, 2690, 2691, 2692, 2693, 2694, 2695, 2696, 2697, 2698, 2699, 2700, 2701, 2702, 2703, 2704, 2705, 2706, 2707, 2708, 2709, 2710, 2711, 2712, 2713, 2714, 2715, 2716, 2717, 2718, 2719, 2720, 2721, 2722, 2723, 2724, 2725, 2726, 2727, 2728, 2729, 2730, 2731, 2732, 2733, 2734, 2735, 2736, 2737, 2738, 2739, 2740, 2741, 2742, 2743, 2744, 2745, 2746, 2747, 2748, 2749, 2750, 2751, 2752, 2753, 2754, 2755, 2756, 2757, 2758, 2759, 2760, 2761, 2762, 2763, 2764, 2765, 2766, 2767, 2768, 2769, 2770, 2771, 2772, 2773, 2774, 2775, 2776, 2777, 2778, 2779, 2780, 2781, 2782, 2783, 2784, 2785, 2786, 2787, 2788, 2789, 2790, 2791, 2792, 2793, 2794, 2795, 2796, 2797, 2798, 2799, 2800],
                      });
                      
                      // Disable all error markers globally
                      monaco.editor.setModelMarkers(monaco.editor.getModels()[0], 'owner', []);
                    }}
                    onMount={(editor, monaco) => {
                      editorRef.current = editor;
                      
                      // Clear all markers on mount
                      const model = editor.getModel();
                      if (model) {
                        monaco.editor.setModelMarkers(model, 'owner', []);
                      }
                      
                      // Listen for marker changes and clear them
                      monaco.editor.onDidChangeMarkers(() => {
                        const model = editor.getModel();
                        if (model) {
                          monaco.editor.setModelMarkers(model, 'owner', []);
                        }
                      });
                    }}
                  />
                )}
              </div>

              {/* Terminal Panel */}
              {showTerminal && (
                <div 
                  className="border-t-2 border-orange-500/40 bg-black flex flex-col"
                  style={{ height: `${terminalHeight}px` }}
                >
                  {/* Terminal Header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-black via-gray-900 to-black border-b border-orange-500/30">
                    <div className="flex items-center gap-3">
                      <svg className="h-4 w-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-semibold text-white">Terminal</span>
                      {projectId && (
                        <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                          {projectId}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTerminalLogs([])}
                        className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
                        title="Clear terminal"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowTerminal(false)}
                        className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
                        title="Hide terminal"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Resize Handle */}
                  <div
                    className="h-1 bg-orange-500/20 hover:bg-orange-500/40 cursor-ns-resize transition-colors"
                    onMouseDown={(e) => {
                      setIsResizing(true);
                      const startY = e.clientY;
                      const startHeight = terminalHeight;
                      
                      const handleMouseMove = (e: MouseEvent) => {
                        const delta = startY - e.clientY;
                        const newHeight = Math.max(100, Math.min(500, startHeight + delta));
                        setTerminalHeight(newHeight);
                      };
                      
                      const handleMouseUp = () => {
                        setIsResizing(false);
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />

                  {/* Terminal Content */}
                  <div 
                    ref={terminalRef}
                    className="flex-1 overflow-y-auto p-3 font-mono text-xs text-gray-300 space-y-1"
                  >
                    {terminalLogs.length === 0 ? (
                      <div className="text-gray-500 text-center py-8">
                        <svg className="h-8 w-8 mx-auto mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p>No logs yet. Project status will appear here.</p>
                      </div>
                    ) : (
                      terminalLogs.map((log, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-gray-600 flex-shrink-0">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                          <span className={`flex-shrink-0 ${
                            log.type === 'error' ? 'text-red-400' :
                            log.type === 'success' ? 'text-green-400' :
                            log.type === 'warning' ? 'text-yellow-400' :
                            'text-blue-400'
                          }`}>
                            {log.type === 'error' ? '✗' :
                             log.type === 'success' ? '✓' :
                             log.type === 'warning' ? '⚠' : 'ℹ'}
                          </span>
                          <span className={`flex-1 ${
                            log.type === 'error' ? 'text-red-300' :
                            log.type === 'success' ? 'text-green-300' :
                            log.type === 'warning' ? 'text-yellow-300' :
                            'text-gray-300'
                          }`}>
                            {log.message}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="bg-black rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <svg className="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">Select a file to view</p>
                <p className="text-xs text-gray-600 mt-1">Choose from the explorer</p>
              </div>
            </div>
          )}

          {/* Terminal Toggle Button (when hidden) */}
          {!showTerminal && selectedFile && (
            <button
              onClick={() => setShowTerminal(true)}
              className="absolute bottom-4 right-4 p-2 bg-orange-500 hover:bg-orange-600 rounded-lg shadow-lg transition-all"
              title="Show terminal"
            >
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* New File Dialog */}
      {showNewFileDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-orange-500/30 rounded-lg p-6 w-96">
            <h3 className="text-white font-semibold mb-4">Create New</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setNewFileType('file')}
                  className={`flex-1 py-2 rounded ${newFileType === 'file' ? 'bg-orange-500 text-black' : 'bg-gray-800 text-white'}`}
                >
                  File
                </button>
                <button
                  onClick={() => setNewFileType('folder')}
                  className={`flex-1 py-2 rounded ${newFileType === 'folder' ? 'bg-orange-500 text-black' : 'bg-gray-800 text-white'}`}
                >
                  Folder
                </button>
              </div>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder={`${newFileType === 'file' ? 'file.tsx' : 'folder-name'}`}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNewFile();
                  if (e.key === 'Escape') setShowNewFileDialog(false);
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleNewFile}
                  className="flex-1 bg-orange-500 text-black py-2 rounded hover:bg-orange-600"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewFileDialog(false)}
                  className="flex-1 bg-gray-800 text-white py-2 rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-gray-900 border border-orange-500/30 rounded-lg shadow-xl py-1 min-w-[150px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => {
                setRenameTarget(contextMenu.path);
                setRenameValue(contextMenu.path.split('/').pop() || '');
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800 flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Rename
            </button>
            <button
              onClick={() => {
                handleDeleteFile(contextMenu.path);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800 flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'json': 'json',
    'css': 'css',
    'scss': 'scss',
    'html': 'html',
    'md': 'markdown',
    'py': 'python',
  };
  return languageMap[ext || ''] || 'plaintext';
}
