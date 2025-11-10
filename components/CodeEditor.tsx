'use client';

import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

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
  const editorRef = useRef<any>(null);

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

  const toggleFolder = (path: string) => {
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
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/files/${projectId}/${selectedFile}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fileContent }),
      });
      
      if (response.ok) {
        setHasUnsavedChanges(false);
        onFileUpdate?.(selectedFile, fileContent);
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  const handleNewFile = async () => {
    if (!projectId || !newFileName.trim()) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/files/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          path: newFileName,
          type: newFileType,
          content: newFileType === 'file' ? '' : undefined
        }),
      });
      
      if (response.ok) {
        setShowNewFileDialog(false);
        setNewFileName('');
        // Trigger refresh
        onFileChange?.();
      }
    } catch (error) {
      console.error('Failed to create file:', error);
    }
  };

  const handleDeleteFile = async (path: string) => {
    if (!projectId || !confirm(`Delete ${path}?`)) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/files/${projectId}/${path}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove from tabs
        setOpenTabs(openTabs.filter(t => t !== path));
        if (selectedFile === path) {
          setSelectedFile(null);
        }
        // Trigger refresh
        onFileChange?.();
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const handleRenameFile = async () => {
    if (!projectId || !renameTarget || !renameValue.trim()) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/files/${projectId}/${renameTarget}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_name: renameValue }),
      });
      
      if (response.ok) {
        setRenameTarget(null);
        setRenameValue('');
        // Trigger refresh
        onFileChange?.();
      }
    } catch (error) {
      console.error('Failed to rename file:', error);
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
        return '🖼️';
      default:
        return '📄';
    }
  };

  const renderFileTree = (nodes: FileNode[], level: number = 0) => {
    return nodes.map((node) => (
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
            className={`flex items-center px-2 py-1 hover:bg-gray-900 cursor-pointer transition-colors ${
              selectedFile === node.path ? 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-l-2 border-orange-500' : ''
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
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-3 border-b border-orange-500/30 bg-black flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h2 className="text-sm font-semibold text-white">Explorer</h2>
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

      <div className="flex-1 flex overflow-hidden">
        {/* File Tree */}
        <div className="w-64 border-r border-orange-500/30 overflow-y-auto bg-black">
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

        {/* Code View */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
          {selectedFile ? (
            <>
              {/* File Tabs */}
              <div className="flex items-center border-b border-orange-500/30 bg-black overflow-x-auto">
                {openTabs.map((tab) => (
                  <div
                    key={tab}
                    className={`flex items-center gap-2 px-3 py-2 border-r border-orange-500/30 cursor-pointer group ${
                      selectedFile === tab ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
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

              {/* Editor Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 bg-black border-b border-orange-500/30">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{selectedFile}</span>
                  {hasUnsavedChanges && <span className="text-orange-400">• Modified</span>}
                </div>
                <button
                  onClick={handleSaveFile}
                  disabled={!hasUnsavedChanges}
                  className="px-3 py-1 bg-orange-500 text-black text-xs rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save (Ctrl+S)
                </button>
              </div>

              {/* Monaco Editor */}
              <div className="flex-1 overflow-hidden">
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
                  }}
                  onMount={(editor) => {
                    editorRef.current = editor;
                  }}
                />
              </div>
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
