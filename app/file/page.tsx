'use client';

import { invoke } from '@tauri-apps/api/core'
import { useState } from 'react'

interface SearchResult {
  path: string
  line_number: number
  content: string
}

export default function FileSearch() {
  const [pattern, setPattern] = useState('')
  const [directory, setDirectory] = useState('.')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 高亮显示匹配文本的函数
  const highlightText = (text: string, pattern: string) => {
    if (!pattern) return text;

    try {
      // 转义正则表达式特殊字符
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedPattern})`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, index) => {
        if (part.toLowerCase() === pattern.toLowerCase()) {
          return <span key={index} className="text-red-400 font-semibold">{part}</span>;
        }
        return part;
      });
    } catch (e) {
      // 如果正则表达式无效，返回原始文本
      return text;
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Searching with pattern:', pattern, 'in directory:', directory)
      const searchResults = await invoke<SearchResult[]>('search_files', {
        pattern,
        directory,
      })
      console.log('Search results:', searchResults)
      setResults(searchResults)
    } catch (error) {
      console.error('搜索出错:', error)
      setError(String(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="搜索模式"
          className="px-4 py-2 border rounded bg-gray-800 text-gray-100 border-gray-600 placeholder-gray-400"
        />
        <input
          type="text"
          value={directory}
          onChange={(e) => setDirectory(e.target.value)}
          placeholder="搜索目录"
          className="px-4 py-2 border rounded bg-gray-800 text-gray-100 border-gray-600 placeholder-gray-400"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          {loading ? '搜索中...' : '搜索'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500 text-white rounded">
          错误: {error}
        </div>
      )}

      <div className="space-y-4">
        {results && results.length > 0 ? (
          results.map((result, index) => (
            <div key={index} className="p-4 border rounded border-gray-700 bg-gray-800">
              <div className="font-mono text-sm text-blue-400">
                {result.path}:{result.line_number}
              </div>
              <pre className="mt-2 p-2 bg-gray-900 rounded text-gray-100 overflow-x-auto whitespace-pre-wrap">
                {highlightText(result.content, pattern)}
              </pre>
            </div>
          ))
        ) : (
          <div className="text-gray-400">
            {loading ? '搜索中...' : '没有搜索结果'}
          </div>
        )}
      </div>
    </div>
  )
} 
