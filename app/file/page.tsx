'use client';

import { invoke } from '@tauri-apps/api/core'
import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Search, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

type SearchResult = {
  path: string;
  line_number: number;
  content: string;
  is_match: boolean;  // 新增字段,用于标识是否为匹配行
};

// 添加一个新的类型来表示组合后的搜索结果
type GroupedSearchResult = {
  path: string;
  mainLineNumber: number;  // 匹配行的行号
  lines: {
    lineNumber: number;
    content: string;
    isMatch: boolean;
  }[];
};

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
    context_lines: 2,  // 新增上下文行数字段，默认值为2
  });

  // 添加一个新的状态用于展示结果
  const [displayContextLines, setDisplayContextLines] = useState(2);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [includeInput, setIncludeInput] = useState('');
  const [excludeInput, setExcludeInput] = useState('');

  // 高亮显示匹配文本的函数
  const highlightText = (text: string, pattern: string, isMatch: boolean) => {
    if (!isMatch) {
      return <span className="text-gray-500">{text}</span>; // 上下文行使用灰色显示
    }

    if (!pattern) return text;

    try {
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
      // 更新展示用的上下文行数
      setDisplayContextLines(searchOptions.context_lines);
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

  // 修改 groupSearchResults 函数使用 displayContextLines
  const groupSearchResults = (results: SearchResult[]): GroupedSearchResult[] => {
    const fileGroups = new Map<string, SearchResult[]>();

    results.forEach(result => {
      if (!fileGroups.has(result.path)) {
        fileGroups.set(result.path, []);
      }
      fileGroups.get(result.path)?.push(result);
    });

    const grouped: GroupedSearchResult[] = [];

    fileGroups.forEach((fileResults, path) => {
      fileResults.sort((a, b) => a.line_number - b.line_number);

      const matchResults = fileResults.filter(r => r.is_match);

      matchResults.forEach(match => {
        const contextLines = fileResults.filter(r =>
          // 使用 displayContextLines 而不是 searchOptions.context_lines
          Math.abs(r.line_number - match.line_number) <= displayContextLines
        );

        grouped.push({
          path,
          mainLineNumber: match.line_number,
          lines: contextLines.map(line => ({
            lineNumber: line.line_number,
            content: line.content,
            isMatch: line.is_match
          })).sort((a, b) => a.lineNumber - b.lineNumber)
        });
      });
    });

    return grouped;
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* 搜索区域 */}
      <div className="space-y-6">
        {/* 第一行：搜索输入和按钮 */}
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="搜索内容"
              value={searchOptions.pattern}
              onChange={(e) => setSearchOptions({ ...searchOptions, pattern: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="min-w-24"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                搜索中
              </>
            ) : (
              '搜索'
            )}
          </Button>
        </div>

        {/* 搜索选项网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
          {/* 第一行：基本选项 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">搜索目录</label>
            <Input
              type="text"
              value={searchOptions.directory}
              onChange={(e) => setSearchOptions({ ...searchOptions, directory: e.target.value })}
              placeholder="."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">文件类型</label>
            <Input
              type="text"
              value={searchOptions.file_type}
              onChange={(e) => setSearchOptions({ ...searchOptions, file_type: e.target.value })}
              placeholder="例如: rust, js, ts"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">搜索深度 (1-10)</label>
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
            />
          </div>

          {/* 第二行：上下文行数和开关选项 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">上下文行数 (0-10)</label>
            <Input
              type="number"
              min={0}
              max={10}
              value={searchOptions.context_lines}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 0 && value <= 10) {
                  setSearchOptions({ ...searchOptions, context_lines: value });
                }
              }}
            />
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="case-sensitive"
                checked={searchOptions.case_sensitive}
                onCheckedChange={(checked) =>
                  setSearchOptions({ ...searchOptions, case_sensitive: checked })
                }
              />
              <Label htmlFor="case-sensitive">区分大小写</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="search-hidden"
                checked={searchOptions.search_hidden}
                onCheckedChange={(checked) =>
                  setSearchOptions({ ...searchOptions, search_hidden: checked })
                }
              />
              <Label htmlFor="search-hidden">搜索隐藏文件</Label>
            </div>
          </div>

          {/* 第三行：包含和排除路径 */}
          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 包含路径 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                包含文件路径
              </label>
              <div className="flex flex-col gap-2">
                <Input
                  value={includeInput}
                  onChange={(e) => setIncludeInput(e.target.value)}
                  onKeyDown={handleIncludeKeyDown}
                  placeholder="例如: *.js, src/*.ts (按回车添加)"
                />
                <div className="min-h-[32px] flex flex-wrap gap-2">
                  {searchOptions.include_globs.map((glob, index) => (
                    <Badge key={index} variant="secondary" className="h-6">
                      {glob}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => {
                          const newGlobs = [...searchOptions.include_globs];
                          newGlobs.splice(index, 1);
                          setSearchOptions({ ...searchOptions, include_globs: newGlobs });
                        }}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* 排除路径 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                排除文件路径
              </label>
              <div className="flex flex-col gap-2">
                <Input
                  value={excludeInput}
                  onChange={(e) => setExcludeInput(e.target.value)}
                  onKeyDown={handleExcludeKeyDown}
                  placeholder="例如: node_modules/*, *.test.js (按回车添加)"
                />
                <div className="min-h-[32px] flex flex-wrap gap-2">
                  {searchOptions.exclude_globs.map((glob, index) => (
                    <Badge key={index} variant="secondary" className="h-6">
                      {glob}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => {
                          const newGlobs = [...searchOptions.exclude_globs];
                          newGlobs.splice(index, 1);
                          setSearchOptions({ ...searchOptions, exclude_globs: newGlobs });
                        }}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {/* 搜索结果 */}
      <div className="mt-6 space-y-4">
        {groupSearchResults(results).map((group, groupIndex) => (
          <div key={groupIndex} className="overflow-hidden border border-gray-200 rounded-lg">
            <div className="bg-gray-100 px-4 py-2 text-sm text-gray-600 font-medium">
              {group.path}:{group.mainLineNumber}
            </div>
            <div className="p-4 font-mono text-sm bg-white">
              {group.lines.map((line, lineIndex) => (
                <div
                  key={lineIndex}
                  className={cn(
                    "whitespace-pre",
                    line.isMatch ? "bg-yellow-50" : ""
                  )}
                >
                  {highlightText(line.content, searchOptions.pattern, line.isMatch)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
