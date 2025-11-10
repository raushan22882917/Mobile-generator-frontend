'use client';

import Image from 'next/image';
import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  onSubmit: (prompt: string, templateId?: string | null) => void;
  onEdit?: (prompt: string) => void;
  isLoading: boolean;
  messages: Message[];
  projectId?: string | null;
  hasActiveProject?: boolean;
  onImageGenerate?: (prompt: string) => Promise<void>;
}

// Extend Window interface for template application
declare global {
  interface Window {
    applyTemplate?: (templateId: string) => Promise<void>;
  }
}

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
}

export default function ChatPanel({ onSubmit, onEdit, isLoading, messages, projectId, hasActiveProject, onImageGenerate }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'create' | 'edit' | 'image'>('create');
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [filePickerPosition, setFilePickerPosition] = useState({ top: 0, left: 0 });
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [mentionedFiles, setMentionedFiles] = useState<string[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Array<{url: string, prompt: string, filename: string}>>([]);
  const [showImageRename, setShowImageRename] = useState<string | null>(null);
  const [imageRenameValue, setImageRenameValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim().length < 10) return;
    
    if (mode === 'image') {
      await handleImageGeneration();
    } else if (mode === 'edit' && onEdit && hasActiveProject) {
      // Check if user wants to create new files/screens
      const createKeywords = ['create', 'add', 'new', 'generate', 'make'];
      const fileKeywords = ['screen', 'page', 'component', 'file'];
      const prompt = input.trim().toLowerCase();
      
      const isCreating = createKeywords.some(kw => prompt.includes(kw)) && 
                        fileKeywords.some(kw => prompt.includes(kw));
      
      if (isCreating) {
        await handleScreenGeneration();
      } else {
        onEdit(input.trim());
      }
    } else {
      // Create mode - show template selector if not already selected
      if (!selectedTemplate && mode === 'create') {
        setShowTemplateSelector(true);
        return;
      }
      onSubmit(input.trim(), selectedTemplate);
    }
    setInput('');
  };

  const handleApplyTemplate = async (templateId: string) => {
    if (!projectId || !hasActiveProject) {
      alert('Please create or load a project first');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/apply-template`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'dev-key-12345'
        },
        body: JSON.stringify({ 
          project_id: projectId,
          template_id: templateId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply template');
      }

      const data = await response.json();
      alert(`✅ Template Applied!\n\n${data.message}\n\nFiles updated: ${data.files_updated.length}`);
      
    } catch (error: any) {
      console.error('Template application error:', error);
      alert('Failed to apply template: ' + error.message);
    }
  };

  const handleScreenGeneration = async () => {
    if (!projectId || !hasActiveProject) {
      alert('Please create or load a project first');
      return;
    }

    setIsGeneratingImage(true); // Reuse loading state
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/generate-screen`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'dev-key-12345'
        },
        body: JSON.stringify({ 
          prompt: input.trim(),
          project_id: projectId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate screen');
      }

      const data = await response.json();
      
      // Add message to chat (would need to be passed up to parent)
      console.log('Screen generated:', data);
      alert(`✅ Created ${data.files_created.length} file(s):\n${data.files_created.join('\n')}\n\n${data.summary}`);
      
    } catch (error: any) {
      console.error('Screen generation error:', error);
      alert('Failed to generate screen: ' + error.message);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleImageGeneration = async () => {
    if (!projectId || !hasActiveProject) {
      alert('Please create or load a project first');
      return;
    }

    setIsGeneratingImage(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: input.trim(),
          project_id: projectId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();
      
      // Check if it's a placeholder
      if (data.is_placeholder) {
        alert(`⚠️ Image Generation Not Configured\n\n${data.message}\n\nSee GEMINI_SETUP.md for setup instructions.`);
        return;
      }
      
      // Add to generated images list
      setGeneratedImages(prev => [...prev, {
        url: data.image_url,
        prompt: input.trim(),
        filename: data.filename
      }]);

      // Add message to chat
      const imageMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🎨 Image generated: ${data.filename}\nSaved to: ${data.path}`,
        timestamp: new Date(),
      };
      
      // This would need to be passed up to parent component
      // For now, we'll just show in console
      console.log('Image generated:', data);
      
      // Show success notification
      alert(`✅ Image Generated!\n\nFilename: ${data.filename}\nPath: ${data.path}`);
      
    } catch (error: any) {
      console.error('Image generation error:', error);
      alert('Failed to generate image: ' + error.message);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSaveImage = async (imageUrl: string, filename: string) => {
    if (!projectId) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/save-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          image_url: imageUrl,
          filename: filename
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Image saved to: ${data.path}`);
      }
    } catch (error) {
      console.error('Failed to save image:', error);
    }
  };

  const handleRenameImage = async (oldFilename: string, newFilename: string) => {
    if (!projectId || !newFilename.trim()) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/rename-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          old_filename: oldFilename,
          new_filename: newFilename
        }),
      });

      if (response.ok) {
        // Update local state
        setGeneratedImages(prev => prev.map(img => 
          img.filename === oldFilename ? { ...img, filename: newFilename } : img
        ));
        setShowImageRename(null);
      }
    } catch (error) {
      console.error('Failed to rename image:', error);
    }
  };

  // Auto-switch mode based on project state
  useEffect(() => {
    if (hasActiveProject && mode === 'create') {
      setMode('edit');
    }
  }, [hasActiveProject, mode]);

  // Load available files when project is active
  const extractFilePaths = useCallback((nodes: FileNode[], basePath = ''): string[] => {
    return nodes.reduce<string[]>((paths, node) => {
      const fullPath = basePath ? `${basePath}/${node.name}` : node.name;

      if (node.type === 'file') {
        paths.push(fullPath);
      }

      if (node.children) {
        paths.push(...extractFilePaths(node.children, fullPath));
      }

      return paths;
    }, []);
  }, []);

  const loadProjectFiles = useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/files/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        const files = extractFilePaths(data.file_tree || []);
        setAvailableFiles(files);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  }, [projectId, extractFilePaths]);

  useEffect(() => {
    if (projectId && hasActiveProject) {
      void loadProjectFiles();
    }
  }, [projectId, hasActiveProject, loadProjectFiles]);

  const loadTemplates = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/templates`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }, []);

  // Load templates on mount
  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setInput(value);
    setCursorPosition(cursorPos);
    
    // Check if user typed @ to trigger file picker
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      
      // Show file picker if @ is at start or after space, and no space after @
      if ((lastAtIndex === 0 || value[lastAtIndex - 1] === ' ') && !textAfterAt.includes(' ')) {
        setFileSearchQuery(textAfterAt);
        setShowFilePicker(true);
        
        // Calculate position for file picker
        if (textareaRef.current) {
          const rect = textareaRef.current.getBoundingClientRect();
          setFilePickerPosition({
            top: rect.top - 200, // Show above textarea
            left: rect.left,
          });
        }
      } else {
        setShowFilePicker(false);
      }
    } else {
      setShowFilePicker(false);
    }
  };

  const insertFileMention = (filePath: string) => {
    const textBeforeCursor = input.substring(0, cursorPosition);
    const textAfterCursor = input.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const newText = 
        input.substring(0, lastAtIndex) + 
        `@${filePath} ` + 
        textAfterCursor;
      
      setInput(newText);
      setMentionedFiles([...mentionedFiles, filePath]);
      setShowFilePicker(false);
      
      // Focus back on textarea
      setTimeout(() => {
        textareaRef.current?.focus();
        const newCursorPos = lastAtIndex + filePath.length + 2;
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const getFilteredFiles = () => {
    if (!fileSearchQuery) return availableFiles;
    
    return availableFiles.filter(file => 
      file.toLowerCase().includes(fileSearchQuery.toLowerCase())
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showFilePicker) return;
    
    const filteredFiles = getFilteredFiles();
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedFileIndex((prev) => 
        prev < filteredFiles.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedFileIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && filteredFiles.length > 0) {
      e.preventDefault();
      insertFileMention(filteredFiles[selectedFileIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowFilePicker(false);
    }
  };

  // Reset selected index when filtered files change
  useEffect(() => {
    setSelectedFileIndex(0);
  }, [fileSearchQuery]);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-orange-500/30 bg-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Chat</h2>
              <p className="text-xs text-gray-400">
                {mode === 'create' ? 'Describe your app idea' : 'Edit your project'}
              </p>
            </div>
          </div>
          {hasActiveProject && (
            <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
              <button
                onClick={() => setMode('create')}
                className={`px-3 py-1 text-xs rounded transition-all ${
                  mode === 'create'
                    ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Create
              </button>
              <button
                onClick={() => setMode('edit')}
                className={`px-3 py-1 text-xs rounded transition-all ${
                  mode === 'edit'
                    ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Edit
              </button>
              <button
                onClick={() => setMode('image')}
                className={`px-3 py-1 text-xs rounded transition-all ${
                  mode === 'image'
                    ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Generate images with Gemini AI"
              >
                🎨 Image
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && generatedImages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="bg-black rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
              <svg className="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Start a conversation</p>
            <p className="text-xs text-gray-600 mt-1">
              {mode === 'image' ? 'Describe an image to generate' : 'Tell me what app you want to build'}
            </p>
          </div>
        ) : (
          <>
            {/* Generated Images Gallery */}
            {generatedImages.length > 0 && mode === 'image' && (
              <div className="space-y-3">
                <div className="text-xs text-gray-400 font-semibold">Generated Images</div>
                {generatedImages.map((img, index) => (
                  <div key={index} className="bg-black border border-orange-500/30 rounded-lg p-3">
                    <Image
                      src={img.url}
                      alt={img.prompt}
                      width={512}
                      height={512}
                      className="w-full rounded mb-2"
                      unoptimized
                    />
                    <div className="flex items-center justify-between">
                      {showImageRename === img.filename ? (
                        <input
                          type="text"
                          value={imageRenameValue}
                          onChange={(e) => setImageRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameImage(img.filename, imageRenameValue);
                            }
                            if (e.key === 'Escape') setShowImageRename(null);
                          }}
                          onBlur={() => handleRenameImage(img.filename, imageRenameValue)}
                          className="flex-1 bg-gray-800 text-white px-2 py-1 text-xs rounded"
                          autoFocus
                        />
                      ) : (
                        <div className="flex-1">
                          <p className="text-xs text-white">{img.filename}</p>
                          <p className="text-xs text-gray-500 truncate">{img.prompt}</p>
                        </div>
                      )}
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setShowImageRename(img.filename);
                            setImageRenameValue(img.filename);
                          }}
                          className="p-1 hover:bg-gray-800 rounded text-orange-400"
                          title="Rename"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <a
                          href={img.url}
                          download={img.filename}
                          className="p-1 hover:bg-gray-800 rounded text-orange-400"
                          title="Download"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {messages.length > 0 && (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 shadow-md ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-black'
                    : 'bg-black text-white border border-orange-500/30'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-black/60' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-black border border-orange-500/30 rounded-lg px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <>
          <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-40" 
            onClick={() => setShowTemplateSelector(false)}
          />
          <div className="fixed inset-4 md:inset-8 lg:inset-16 z-50 bg-gray-900 border-2 border-orange-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-yellow-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <svg className="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    Choose Your Template
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">Select a color scheme and UI design for your app</p>
                </div>
                <button
                  onClick={() => setShowTemplateSelector(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-all"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* No Template Option */}
                <div className="group relative bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 hover:border-gray-500 rounded-2xl overflow-hidden transition-all hover:shadow-xl hover:scale-105">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center border-2 border-gray-700">
                        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white">No Template</h4>
                        <p className="text-xs text-gray-500">AI Default</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-400 mb-4">Let AI choose the colors automatically based on your app description</p>
                    
                    <div className="flex gap-2 mb-4">
                      <div className="flex-1 h-8 rounded bg-gray-700"></div>
                      <div className="flex-1 h-8 rounded bg-gray-600"></div>
                      <div className="flex-1 h-8 rounded bg-gray-500"></div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedTemplate(null);
                        setShowTemplateSelector(false);
                        onSubmit(input.trim(), null);
                        setInput('');
                      }}
                      className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
                    >
                      Select Default
                    </button>
                  </div>
                </div>

                {/* Template Options */}
                {templates.map((template) => (
                  <div 
                    key={template.id}
                    className="group relative rounded-2xl overflow-hidden transition-all hover:shadow-2xl hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${template.colors.background} 0%, ${template.colors.surface} 100%)`,
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      borderColor: template.colors.primary + '50'
                    }}
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div 
                          className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg"
                          style={{ backgroundColor: template.colors.primary }}
                        >
                          <div 
                            className="w-8 h-8 rounded-lg shadow-inner"
                            style={{ backgroundColor: template.colors.secondary }}
                          />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold" style={{ color: template.colors.text_primary }}>
                            {template.name}
                          </h4>
                          <p className="text-xs" style={{ color: template.colors.text_secondary }}>
                            {template.id}
                          </p>
                        </div>
                      </div>
                      
                      {/* Description */}
                      <p className="text-sm mb-4" style={{ color: template.colors.text_secondary }}>
                        {template.description}
                      </p>
                      
                      {/* Color Palette */}
                      <div className="mb-4">
                        <p className="text-xs font-semibold mb-2" style={{ color: template.colors.text_secondary }}>
                          Color Palette
                        </p>
                        <div className="grid grid-cols-5 gap-2">
                          <div className="space-y-1">
                            <div 
                              className="h-10 rounded-lg shadow-md"
                              style={{ backgroundColor: template.colors.primary }}
                              title="Primary"
                            />
                            <p className="text-xs text-center" style={{ color: template.colors.text_secondary }}>Primary</p>
                          </div>
                          <div className="space-y-1">
                            <div 
                              className="h-10 rounded-lg shadow-md"
                              style={{ backgroundColor: template.colors.secondary }}
                              title="Secondary"
                            />
                            <p className="text-xs text-center" style={{ color: template.colors.text_secondary }}>Second</p>
                          </div>
                          <div className="space-y-1">
                            <div 
                              className="h-10 rounded-lg shadow-md"
                              style={{ backgroundColor: template.colors.accent }}
                              title="Accent"
                            />
                            <p className="text-xs text-center" style={{ color: template.colors.text_secondary }}>Accent</p>
                          </div>
                          <div className="space-y-1">
                            <div 
                              className="h-10 rounded-lg shadow-md border"
                              style={{ 
                                backgroundColor: template.colors.surface,
                                borderColor: template.colors.border
                              }}
                              title="Surface"
                            />
                            <p className="text-xs text-center" style={{ color: template.colors.text_secondary }}>Surface</p>
                          </div>
                          <div className="space-y-1">
                            <div 
                              className="h-10 rounded-lg shadow-md"
                              style={{ backgroundColor: template.colors.text_primary }}
                              title="Text"
                            />
                            <p className="text-xs text-center" style={{ color: template.colors.text_secondary }}>Text</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* UI Preview - Live HTML */}
                      <div className="mb-4 rounded-lg overflow-hidden border-2" style={{ borderColor: template.colors.border }}>
                        <iframe
                          src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/template-preview/${template.id}`}
                          className="w-full h-64 border-0"
                          title={`${template.name} Preview`}
                          sandbox="allow-same-origin"
                        />
                      </div>
                      
                      {/* Select Button */}
                      <button
                        onClick={() => {
                          setSelectedTemplate(template.id);
                          setShowTemplateSelector(false);
                          onSubmit(input.trim(), template.id);
                          setInput('');
                        }}
                        className="w-full py-3 font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        style={{ 
                          backgroundColor: template.colors.primary,
                          color: template.colors.surface
                        }}
                      >
                        Select {template.name}
                      </button>
                    </div>
                    
                    {/* Hover Effect Overlay */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
                      style={{ backgroundColor: template.colors.primary }}
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-orange-500/30 bg-black/50">
              <p className="text-xs text-center text-gray-500">
                💡 You can change the template later from the chat panel
              </p>
            </div>
          </div>
        </>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-orange-500/30 bg-black">
        {mode === 'create' && !hasActiveProject && (
          <div className="mb-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-400 flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <span>
                <strong>Tip:</strong> You&apos;ll be able to choose a color template after describing your app
              </span>
            </p>
          </div>
        )}
        {hasActiveProject && mode !== 'image' && (
          <div className="mb-2">
            {/* Template Selector for Existing Project */}
            <div className="px-3 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-purple-400 flex items-center gap-2 font-semibold">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Change Color Theme
                </p>
                <button
                  type="button"
                  onClick={() => {
                    // Show template selector for applying to existing project
                    const modal = document.createElement('div');
                    modal.className = 'fixed inset-0 z-50';
                    modal.innerHTML = `
                      <div class="fixed inset-0 bg-black/90 backdrop-blur-sm"></div>
                      <div class="fixed inset-4 md:inset-8 lg:inset-16 bg-gray-900 border-2 border-purple-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        <div class="p-6 border-b border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                          <div class="flex items-center justify-between">
                            <div>
                              <h3 class="text-2xl font-bold text-white flex items-center gap-3">
                                <svg class="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                </svg>
                                Apply Template to Project
                              </h3>
                              <p class="text-sm text-gray-400 mt-1">Select a template to update your app&apos;s colors</p>
                            </div>
                            <button onclick="this.closest(&apos;.fixed&apos;).remove()" class="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-all">
                              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div class="flex-1 overflow-y-auto p-6" id="template-grid"></div>
                      </div>
                    `;
                    document.body.appendChild(modal);
                    
                    // Render templates
                    const grid = modal.querySelector('#template-grid');
                    if (grid) {
                      grid.innerHTML = `
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          ${templates.map(t => `
                            <div class="group relative rounded-2xl overflow-hidden transition-all hover:shadow-2xl hover:scale-105" 
                                 style="background: linear-gradient(135deg, ${t.colors.background} 0%, ${t.colors.surface} 100%); border: 2px solid ${t.colors.primary}50;">
                              <div class="p-6">
                                <div class="flex items-center gap-3 mb-4">
                                  <div class="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg" style="background-color: ${t.colors.primary}">
                                    <div class="w-8 h-8 rounded-lg shadow-inner" style="background-color: ${t.colors.secondary}"></div>
                                  </div>
                                  <div>
                                    <h4 class="text-lg font-bold" style="color: ${t.colors.text_primary}">${t.name}</h4>
                                    <p class="text-xs" style="color: ${t.colors.text_secondary}">${t.id}</p>
                                  </div>
                                </div>
                                <p class="text-sm mb-4" style="color: ${t.colors.text_secondary}">${t.description}</p>
                                <div class="grid grid-cols-5 gap-2 mb-4">
                                  <div class="h-10 rounded-lg shadow-md" style="background-color: ${t.colors.primary}"></div>
                                  <div class="h-10 rounded-lg shadow-md" style="background-color: ${t.colors.secondary}"></div>
                                  <div class="h-10 rounded-lg shadow-md" style="background-color: ${t.colors.accent}"></div>
                                  <div class="h-10 rounded-lg shadow-md border" style="background-color: ${t.colors.surface}; border-color: ${t.colors.border}"></div>
                                  <div class="h-10 rounded-lg shadow-md" style="background-color: ${t.colors.text_primary}"></div>
                                </div>
                                <button onclick="window.applyTemplate(&apos;${t.id}&apos;)" 
                                        class="w-full py-3 font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                        style="background-color: ${t.colors.primary}; color: ${t.colors.surface}">
                                  Apply ${t.name}
                                </button>
                              </div>
                            </div>
                          `).join('')}
                        </div>
                      `;
                    }
                    
                    // Set up apply handler
                    window.applyTemplate = async (templateId) => {
                      modal.remove();
                      await handleApplyTemplate(templateId);
                    };
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  🎨 Browse Templates
                </button>
              </div>
              <p className="text-xs text-purple-300/70">
                Instantly update all colors across your entire app
              </p>
            </div>
          </div>
        )}
        {mode === 'image' && hasActiveProject && (
          <div className="mb-2 px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <p className="text-xs text-purple-400 flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Image Mode: Generate images with Gemini AI and save to assets folder
            </p>
          </div>
        )}
        {mode === 'edit' && hasActiveProject && (
          <div className="mb-2 space-y-2">
            <div className="px-3 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-xs text-orange-400 flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Mode: AI will analyze and update your project files
              </p>
            </div>
            <div className="px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-blue-400 flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  <strong>Tip:</strong> Type <kbd className="px-1 py-0.5 bg-blue-500/20 rounded text-xs">@</kbd> to mention specific files
                </span>
              </p>
            </div>
          </div>
        )}
        <div className="flex space-x-2 relative">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'image' && hasActiveProject
                  ? "Describe the image you want to generate..."
                  : mode === 'edit' && hasActiveProject
                  ? "Describe changes... (Type @ to mention files)"
                  : "Describe your app..."
              }
              disabled={isLoading || isGeneratingImage}
              className="w-full px-3 py-2 bg-gray-900 border border-orange-500/30 text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 placeholder-gray-500"
              rows={3}
              maxLength={mode === 'edit' ? 2000 : 1000}
            />
            
            {/* File Mention Tags */}
            {mentionedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {mentionedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 border border-orange-500/40 rounded text-xs text-orange-400"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>{file}</span>
                    <button
                      onClick={() => {
                        setMentionedFiles(mentionedFiles.filter((_, i) => i !== index));
                        setInput(input.replace(`@${file}`, '').trim());
                      }}
                      className="hover:text-orange-300"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || isGeneratingImage || input.trim().length < 10}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-medium rounded-lg hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md self-end"
            title={mode === 'image' ? 'Generate image' : mode === 'edit' ? 'Apply changes' : 'Generate app'}
          >
            {isGeneratingImage ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : mode === 'image' ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ) : mode === 'edit' ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {input.length}/{mode === 'edit' ? '2000' : '1000'} {input.length < 10 && '(min 10 characters)'}
        </p>
      </form>

      {/* File Picker Dropdown */}
      {showFilePicker && mode === 'edit' && hasActiveProject && (
        <>
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setShowFilePicker(false)}
          />
          <div 
            className="fixed z-40 bg-gray-900 border border-orange-500/30 rounded-lg shadow-2xl overflow-hidden"
            style={{
              bottom: '180px',
              left: '20px',
              right: '20px',
              maxHeight: '200px',
            }}
          >
            <div className="p-2 border-b border-orange-500/30 bg-black">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <svg className="h-3 w-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Select file to edit</span>
                {fileSearchQuery && (
                  <span className="text-orange-400">
                    searching: &quot;{fileSearchQuery}&quot;
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-y-auto max-h-[150px]">
              {getFilteredFiles().length > 0 ? (
                getFilteredFiles().map((file, index) => (
                  <button
                    key={index}
                    onClick={() => insertFileMention(file)}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 text-white border-b border-gray-800 last:border-b-0 ${
                      index === selectedFileIndex 
                        ? 'bg-orange-500/20 border-l-2 border-l-orange-500' 
                        : 'hover:bg-gray-800'
                    }`}
                  >
                    <svg className="h-4 w-4 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="truncate">{file}</span>
                    {index === selectedFileIndex && (
                      <svg className="h-3 w-3 text-orange-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  {fileSearchQuery ? (
                    <>
                      <svg className="h-8 w-8 mx-auto mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      No files matching &quot;{fileSearchQuery}&quot;
                    </>
                  ) : (
                    <>
                      <svg className="h-8 w-8 mx-auto mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      No files available
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="p-2 border-t border-orange-500/30 bg-black">
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs">↓</kbd>
                <span>Navigate</span>
                <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs">Enter</kbd>
                <span>Select</span>
                <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs">Esc</kbd>
                <span>Close</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
