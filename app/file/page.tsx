'use client';

import { invoke } from '@tauri-apps/api/core'
import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface SearchResult {
  path: string
  line_number: number
  content: string
}

export default function FileSearch() {
  const [searchOptions, setSearchOptions] = useState({
    pattern: '',
    directory: '.',
    case_sensitive: false,
    search_hidden: true,
    max_depth: 1,
    file_type: '',
    include_globs: [] as string[],    // 改为数组
    exclude_globs: [] as string[],    // 改为数组
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [includeInput, setIncludeInput] = useState('');
  const [excludeInput, setExcludeInput] = useState('');

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
      setLoading(true);
      setError(null);
      console.log('Search options:', searchOptions); // 添加日志以便调试
      const searchResults = await invoke<SearchResult[]>('search_files', {
        options: searchOptions, // 确保正确传递所有选项
      });
      setResults(searchResults);
    } catch (error) {
      console.error('搜索出错:', error);
      setError(String(error));
    } finally {
      setLoading(false);
    }
  };

  // 处理包含路径的添加
  const handleIncludeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && includeInput.trim()) {
      setSearchOptions({
        ...searchOptions,
        include_globs: [...searchOptions.include_globs, includeInput.trim()]
      });
      setIncludeInput('');
    }
  };

  // 处理排除路径的添加
  const handleExcludeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && excludeInput.trim()) {
      setSearchOptions({
        ...searchOptions,
        exclude_globs: [...searchOptions.exclude_globs, excludeInput.trim()]
      });
      setExcludeInput('');
    }
  };

  // 删除包含路径
  const removeIncludePath = (index: number) => {
    setSearchOptions({
      ...searchOptions,
      include_globs: searchOptions.include_globs.filter((_, i) => i !== index)
    });
  };

  // 删除排除路径
  const removeExcludePath = (index: number) => {
    setSearchOptions({
      ...searchOptions,
      exclude_globs: searchOptions.exclude_globs.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              搜索关键词
            </label>
            <Input
              type="text"
              value={searchOptions.pattern}
              onChange={(e) => setSearchOptions({ ...searchOptions, pattern: e.target.value })}
              placeholder="输入搜索关键词"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              搜索目录
            </label>
            <Input
              type="text"
              value={searchOptions.directory}
              onChange={(e) => setSearchOptions({ ...searchOptions, directory: e.target.value })}
              placeholder="输入搜索目录"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                文件类型 (例如: rust, js, ts)
              </label>
              <Input
                type="text"
                value={searchOptions.file_type}
                onChange={(e) => setSearchOptions({ ...searchOptions, file_type: e.target.value })}
                placeholder="输入文件类型"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                搜索深度 (1-10)
              </label>
              <Input
                type="number"
                min={1}
                max={10}
                value={searchOptions.max_depth}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 1 && value <= 10) {
                    setSearchOptions({ ...searchOptions, max_depth: value });
                  }
                }}
                className="w-32"
              />
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="case-sensitive"
                  checked={searchOptions.case_sensitive}
                  onCheckedChange={(checked) =>
                    setSearchOptions({ ...searchOptions, case_sensitive: checked })
                  }
                />
                <label
                  htmlFor="case-sensitive"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  区分大小写
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="search-hidden"
                  checked={searchOptions.search_hidden}
                  onCheckedChange={(checked) =>
                    setSearchOptions({ ...searchOptions, search_hidden: checked })
                  }
                />
                <label
                  htmlFor="search-hidden"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  搜索隐藏文件
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              包含文件路径 (例如: *.js, src/*.ts)
            </label>
            <div className="space-y-2">
              <Input
                type="text"
                value={includeInput}
                onChange={(e) => setIncludeInput(e.target.value)}
                onKeyDown={handleIncludeKeyDown}
                placeholder="输入要包含的文件路径模式，按回车添加"
                className="w-full"
              />
              <div className="flex flex-wrap gap-2">
                {searchOptions.include_globs.map((glob, index) => (
                  <Badge
                    key={`include-${index}`}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    {glob}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => removeIncludePath(index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              排除文件路径 (例如: node_modules/*, *.test.js)
            </label>
            <div className="space-y-2">
              <Input
                type="text"
                value={excludeInput}
                onChange={(e) => setExcludeInput(e.target.value)}
                onKeyDown={handleExcludeKeyDown}
                placeholder="输入要排除的文件路径模式，按回车添加"
                className="w-full"
              />
              <div className="flex flex-wrap gap-2">
                {searchOptions.exclude_globs.map((glob, index) => (
                  <Badge
                    key={`exclude-${index}`}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    {glob}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => removeExcludePath(index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSearch}
          disabled={loading}
          className="w-full"
        >
          <Search className="mr-2 h-4 w-4" />
          {loading ? '搜索中...' : '搜索'}
        </Button>

        {error && (
          <div className="p-4 text-sm text-red-500 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span className="font-medium">{result.path}</span>
                <span>行 {result.line_number}</span>
              </div>
              <div className="text-sm">
                {highlightText(result.content, searchOptions.pattern)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 
