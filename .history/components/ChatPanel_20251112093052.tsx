'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SuggestedScreen {
  name: string;
  file_name: string;
  location: string;
  description: string;
}

interface SuggestedImage {
  description: string;
  filename: string;
  purpose: string;
}

interface PromptSuggestions {
  screens: SuggestedScreen[];
  images: SuggestedImage[];
  total_screens: number;
  total_images: number;
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

interface FileItem {
  path: string;
  type: 'file' | 'folder';
  name: string;
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
  const [availableFiles, setAvailableFiles] = useState<FileItem[]>([]);
  const [mentionedFiles, setMentionedFiles] = useState<FileItem[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Array<{url: string, prompt: string, filename: string}>>([]);
  const [showImageRename, setShowImageRename] = useState<string | null>(null);
  const [imageRenameValue, setImageRenameValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<PromptSuggestions | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const analyzePrompt = async () => {
    if (input.trim().length < 10) return;
    
    setIsAnalyzing(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/analyze-prompt`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'dev-key-12345'
        },
        body: JSON.stringify({ 
          prompt: input.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze prompt');
      }

      const data = await response.json();
      
      if (data.success) {
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
      }
      
    } catch (error: any) {
      console.error('Prompt analysis error:', error);
      // Continue with generation even if analysis fails
      setSuggestions(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

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
      // Create mode - analyze prompt first to show suggestions
      if (mode === 'create' && !showSuggestions) {
        await analyzePrompt();
        return;
      }
      
      // Show template selector if not already selected
      if (!selectedTemplate && mode === 'create') {
        setShowTemplateSelector(true);
        return;
      }
      
      onSubmit(input.trim(), selectedTemplate);
      setShowSuggestions(false);
      setSuggestions(null);
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
      // Use the chat/edit endpoint which is more reliable
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/chat/edit`, {
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
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to generate files');
      }

      const data = await response.json();
      
      if (data.success) {
        // Add message to chat
        console.log('Files generated:', data);
        alert(`✅ ${data.message}\n\nFiles modified: ${data.files_modified?.length || 0}\n\n${data.changes_summary || 'Files created successfully'}`);
      } else {
        throw new Error(data.message || 'Failed to generate files');
      }
      
    } catch (error: any) {
      console.error('File generation error:', error);
      alert('Failed to generate files: ' + error.message);
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
  useEffect(() => {
    if (projectId && hasActiveProject) {
      loadProjectFiles();
    }
  }, [projectId, hasActiveProject]);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/templates`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadProjectFiles = async () => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/files/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        const items = extractFileItems(data.file_tree || []);
        setAvailableFiles(items);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const extractFileItems = (nodes: FileNode[], basePath = ''): FileItem[] => {
    let items: FileItem[] = [];
    
    for (const node of nodes) {
      const fullPath = basePath ? `${basePath}/${node.name}` : node.name;
      
      // Add both files and folders
      items.push({
        path: fullPath,
        type: node.type,
        name: node.name
      });
      
      if (node.children) {
        items = items.concat(extractFileItems(node.children, fullPath));
      }
    }
    
    return items;
  };

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

  const insertFileMention = (item: FileItem) => {
    const textBeforeCursor = input.substring(0, cursorPosition);
    const textAfterCursor = input.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const newText = 
        input.substring(0, lastAtIndex) + 
        `@${item.path} ` + 
        textAfterCursor;
      
      setInput(newText);
      setMentionedFiles([...mentionedFiles, item]);
      setShowFilePicker(false);
      
      // Focus back on textarea
      setTimeout(() => {
        textareaRef.current?.focus();
        const newCursorPos = lastAtIndex + item.path.length + 2;
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const getFilteredFiles = () => {
    let filtered = availableFiles;
    
    if (fileSearchQuery) {
      filtered = availableFiles.filter(item => 
        item.path.toLowerCase().includes(fileSearchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(fileSearchQuery.toLowerCase())
      );
    }
    
    // Sort: folders first (alphabetically), then files (alphabetically)
    return filtered.sort((a, b) => {
      if (a.type === b.type) {
        return a.path.localeCompare(b.path);
      }
      return a.type === 'folder' ? -1 : 1;
    });
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
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      {/* Header with improved gradient and spacing */}
      <div className="p-4 border-b-2 border-orange-500/40 bg-gradient-to-r from-black via-gray-900 to-black shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-orange-500 to-yellow-500 p-2 rounded-xl shadow-lg">
            <svg className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">AI Assistant</h2>
            <p className="text-xs text-orange-400/90">
              {mode === 'create' ? '✨ Create' : mode === 'image' ? '🎨 Image' : '✏️ Edit'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages with improved styling and spacing */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gradient-to-b from-transparent via-gray-900/50 to-black/50">
        {messages.length === 0 && generatedImages.length === 0 ? (
          <div className="text-center text-gray-500 mt-12">
            <div className="bg-gradient-to-br from-black to-gray-900 rounded-2xl p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center border-2 border-orange-500/20 shadow-xl">
              <svg className="h-10 w-10 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-300 mb-2">Start a conversation</p>
            <p className="text-sm text-gray-500">
              {mode === 'image' ? '🎨 Describe an image to generate' : '✨ Tell me what app you want to build'}
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
                    <img src={img.url} alt={img.prompt} className="w-full rounded mb-2" />
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
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-4 shadow-xl ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-orange-500 to-yellow-500 text-black font-medium'
                    : 'bg-gradient-to-br from-gray-800 via-gray-850 to-black text-white border-2 border-orange-500/30'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                <p className={`text-xs mt-2.5 flex items-center gap-1.5 ${message.role === 'user' ? 'text-black/60' : 'text-gray-500'}`}>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-br from-gray-800 to-black border-2 border-orange-500/30 rounded-2xl px-6 py-4 shadow-xl">
              <div className="flex space-x-2.5 items-center">
                <div className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-bounce shadow-lg"></div>
                <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0.3s' }}></div>
                <span className="text-xs text-gray-400 ml-2">AI is thinking...</span>
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

      {/* Input section - Kiro-style */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800 bg-gray-900">
        {/* File/Folder Mention Tags */}
        {mentionedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {mentionedFiles.map((item, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-orange-500/20 border border-orange-500/40 rounded text-xs text-orange-300"
              >
                {item.type === 'folder' ? '📁' : '📄'}
                <span className="font-medium">{item.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMentionedFiles(mentionedFiles.filter((_, i) => i !== index));
                    setInput(input.replace(`@${item.path}`, '').trim());
                  }}
                  className="hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Input container with integrated controls */}
        <div className="relative bg-gray-800 border border-gray-700 rounded-lg focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 transition-all">
          <div className="flex items-end gap-2 p-2">
            {/* Mode Selector - Left side */}
            {hasActiveProject && (
              <button
                type="button"
                onClick={() => {
                  const modes: ('create' | 'edit' | 'image')[] = ['create', 'edit', 'image'];
                  const currentIndex = modes.indexOf(mode);
                  const nextMode = modes[(currentIndex + 1) % modes.length];
                  setMode(nextMode);
                }}
                className="flex-shrink-0 p-2 hover:bg-gray-700 rounded-md transition-colors text-lg"
                title={`Mode: ${mode === 'create' ? 'Create' : mode === 'edit' ? 'Edit' : 'Image'} (click to switch)`}
              >
                {mode === 'create' ? '✨' : mode === 'edit' ? '✏️' : '🎨'}
              </button>
            )}
            
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'image' && hasActiveProject
                  ? "Describe the image..."
                  : mode === 'edit' && hasActiveProject
                  ? "Describe changes... (@ for files)"
                  : "Describe your app idea..."
              }
              disabled={isLoading || isGeneratingImage}
              className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 resize-none focus:outline-none disabled:opacity-50 min-h-[24px] max-h-[200px]"
              rows={1}
              maxLength={mode === 'edit' ? 2000 : 1000}
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 200) + 'px';
              }}
            />
            
            {/* Send Button - Right side */}
            <button
              type="submit"
              disabled={isLoading || isGeneratingImage || input.trim().length < 10}
              className="flex-shrink-0 p-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-md transition-all"
              title={mode === 'image' ? 'Generate image' : mode === 'edit' ? 'Apply changes' : 'Generate app'}
            >
              {isGeneratingImage || isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Footer info */}
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-xs text-gray-500">
            {input.length}/{mode === 'edit' ? '2000' : '1000'} {input.length < 10 && '• min 10'}
          </p>
          {mode === 'edit' && hasActiveProject && (
            <p className="text-xs text-gray-500">
              <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs">@</kbd> mention files
            </p>
          )}
        </div>
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
                <span>Select file or folder</span>
                {fileSearchQuery && (
                  <span className="text-orange-400">searching: &quot;{fileSearchQuery}&quot;</span>
                )}
              </div>
            </div>
            <div className="overflow-y-auto max-h-[150px]">
              {getFilteredFiles().length > 0 ? (
                getFilteredFiles().map((item, index) => (
                  <button
                    key={index}
                    onClick={() => insertFileMention(item)}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 text-white border-b border-gray-800 last:border-b-0 ${
                      index === selectedFileIndex 
                        ? 'bg-orange-500/20 border-l-2 border-l-orange-500' 
                        : 'hover:bg-gray-800'
                    }`}
                  >
                    {item.type === 'folder' ? (
                      <svg className="h-4 w-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    <span className="truncate flex-1">{item.path}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {item.type === 'folder' ? '📁' : '📄'}
                    </span>
                    {index === selectedFileIndex && (
                      <svg className="h-3 w-3 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                      No items matching &quot;{fileSearchQuery}&quot;
                    </>
                  ) : (
                    <>
                      <svg className="h-8 w-8 mx-auto mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      No items available
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
