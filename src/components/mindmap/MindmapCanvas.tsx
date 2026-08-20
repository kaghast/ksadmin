import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Download,
  Image as ImageIcon,
  FileCode,
  Layers,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Focus,
  CheckCircle2,
  Tag
} from 'lucide-react';
import {
  parseMarkdownToTree,
  computeRadialLayout,
  BRANCH_COLORS,
  LayoutNode
} from './mindmapUtils';

interface MindmapCanvasProps {
  markdown: string;
  theme?: string;
  onNodeClick?: (text: string) => void;
  className?: string;
  isFullscreenControlled?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export const MindmapCanvas: React.FC<MindmapCanvasProps> = ({
  markdown,
  theme = 'modern',
  onNodeClick,
  className = '',
  isFullscreenControlled,
  onFullscreenChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Pan & Zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.95 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [internalFullscreen, setInternalFullscreen] = useState(false);

  const isFullscreen = isFullscreenControlled !== undefined ? isFullscreenControlled : internalFullscreen;

  const setFullscreenState = (val: boolean) => {
    setInternalFullscreen(val);
    if (onFullscreenChange) {
      onFullscreenChange(val);
    }
  };

  // Collapsed nodes state (map nodeId -> boolean)
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  // Parse markdown and calculate dual-sided radial layout
  const treeData = useMemo(() => {
    return parseMarkdownToTree(markdown);
  }, [markdown]);

  const layout = useMemo(() => {
    return computeRadialLayout(treeData, collapsedMap);
  }, [treeData, collapsedMap]);

  // Center the mindmap in the container on initial load or reset
  const fitToView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    const { width, height } = layout.bounds;
    const padding = isFullscreen ? 120 : 80;

    const scaleX = (clientWidth - padding) / width;
    const scaleY = (clientHeight - padding) / height;
    const fitScale = Math.min(1.25, Math.max(0.4, Math.min(scaleX, scaleY)));

    setTransform({
      x: clientWidth / 2,
      y: clientHeight / 2,
      scale: fitScale
    });
  }, [layout.bounds, isFullscreen]);

  // Initial fit on mount & when markdown structural bounds change substantially
  useEffect(() => {
    fitToView();
  }, [markdown]);

  // When fullscreen state changes, auto-fit view to new container dimensions
  useEffect(() => {
    const timer = setTimeout(() => {
      fitToView();
    }, 120);
    return () => clearTimeout(timer);
  }, [isFullscreen, fitToView]);

  // ESC key listener to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setFullscreenState(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(2.5, Math.max(0.3, transform.scale * zoomFactor));

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom towards mouse pointer
    const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
    const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);

    setTransform({ x: newX, y: newY, scale: newScale });
  };

  // Dragging / Panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Node collapse toggle
  const toggleCollapse = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedMap((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Reset view to default center
  const handleReset = () => {
    if (!containerRef.current) return;
    setTransform({
      x: containerRef.current.clientWidth / 2,
      y: containerRef.current.clientHeight / 2,
      scale: 1
    });
  };

  const handleZoomIn = () => {
    setTransform((prev) => ({ ...prev, scale: Math.min(2.5, prev.scale * 1.2) }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({ ...prev, scale: Math.max(0.3, prev.scale / 1.2) }));
  };

  const toggleFullscreen = () => {
    setFullscreenState(!isFullscreen);
  };

  // Export as SVG file
  const exportAsSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `zihin-haritasi-${new Date().toISOString().split('T')[0]}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  // Export as High-Resolution PNG
  const exportAsPng = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    const bounds = layout.bounds;
    const width = bounds.width * 2;
    const height = bounds.height * 2;
    canvas.width = width;
    canvas.height = height;

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `zihin-haritasi-${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
      }
    };
    img.src = url;
  };

  const isFixedOverlay = isFullscreen && isFullscreenControlled === undefined;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-slate-50/70 border border-slate-200 rounded-xl overflow-hidden select-none flex flex-col ${
        isFixedOverlay ? 'fixed inset-0 z-50 rounded-none bg-slate-100' : ''
      } ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm pointer-events-auto text-xs text-slate-700 font-semibold">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>Ortadan Dağılım</span>
          <span className="text-[10px] text-slate-400 font-mono">({layout.nodes.length} düğüm)</span>
        </div>

        {/* Action Buttons: Zoom, Fit, Fullscreen, Export */}
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md p-1 rounded-lg border border-slate-200 shadow-sm pointer-events-auto">
          <button
            onClick={handleZoomIn}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
            title="Yakınlaştır (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
            title="Uzaklaştır (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={fitToView}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
            title="Ekrana Sığdır"
          >
            <Focus className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
            title="Görünümü Sıfırla"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          <button
            onClick={exportAsPng}
            className="flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md text-xs font-semibold transition-colors cursor-pointer"
            title="PNG Olarak İndir"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">PNG</span>
          </button>

          <button
            onClick={exportAsSvg}
            className="flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-md text-xs font-semibold transition-colors cursor-pointer"
            title="SVG Olarak İndir"
          >
            <FileCode className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">SVG</span>
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          <button
            onClick={toggleFullscreen}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              isFullscreen
                ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                : 'text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/90 border border-indigo-200/80'
            }`}
            title={isFullscreen ? 'Tam Ekrandan Çık (ESC)' : 'Tam Ekran Görünümü'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="font-medium">Küçült (ESC)</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Tam Ekran</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Interactive SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full flex-1"
        style={{ overflow: 'visible' }}
      >
        {/* Subtle grid pattern background */}
        <defs>
          <pattern
            id="mindmap-grid"
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="16" cy="16" r="0.75" fill="#cbd5e1" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#mindmap-grid)" />

        {/* Dynamic Zoom & Pan Group Container */}
        <g
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
          style={{ transition: isDragging ? 'none' : 'transform 0.05s ease-out' }}
        >
          {/* Connecting Bezier Splines / Paths */}
          <g className="mindmap-connections">
            {layout.connections.map((conn, idx) => (
              <path
                key={`conn-${idx}`}
                d={conn.path}
                fill="none"
                stroke={conn.color}
                strokeWidth={conn.from.level === 0 ? 2.8 : 2}
                strokeLinecap="round"
                opacity={0.85}
              />
            ))}
          </g>

          {/* Mindmap Nodes Group */}
          <g className="mindmap-nodes">
            {layout.nodes.map((node) => {
              const isRoot = node.level === 0;
              const isLevel1 = node.level === 1;
              const colorScheme = BRANCH_COLORS[node.colorIndex % BRANCH_COLORS.length];

              const nodeLeft = node.x - node.width / 2;
              const nodeTop = node.y - node.height / 2;

              // Node Background, Border & Text Styling
              let bgColor = '#ffffff';
              let borderColor = colorScheme.border;
              let textColor = '#1e293b';
              let fontWeight = '500';
              let fontSize = 12;

              if (isRoot) {
                bgColor = '#1e293b';
                borderColor = '#3b82f6';
                textColor = '#ffffff';
                fontWeight = '700';
                fontSize = 13.5;
              } else if (isLevel1) {
                bgColor = colorScheme.bg;
                borderColor = colorScheme.border;
                textColor = colorScheme.text;
                fontWeight = '700';
                fontSize = 12.5;
              } else {
                bgColor = '#ffffff';
                borderColor = '#e2e8f0';
                textColor = '#334155';
                fontWeight = '500';
                fontSize = 11.5;
              }

              // Extract tag or currency highlight
              const hasTag = !!node.tag;
              const displayText = node.text.replace(/#[\wığüşöçİĞÜŞÖÇ]+/g, '').trim();

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="group cursor-pointer"
                  onClick={() => onNodeClick && onNodeClick(node.text)}
                >
                  {/* Node Capsule Box */}
                  <rect
                    x={-node.width / 2}
                    y={-node.height / 2}
                    width={node.width}
                    height={node.height}
                    rx={isRoot ? 12 : isLevel1 ? 8 : 6}
                    ry={isRoot ? 12 : isLevel1 ? 8 : 6}
                    fill={bgColor}
                    stroke={borderColor}
                    strokeWidth={isRoot ? 2.5 : isLevel1 ? 1.8 : 1.2}
                    className="transition-all duration-150 group-hover:brightness-95 filter drop-shadow-2xs"
                  />

                  {/* Left accent indicator bar for sub-nodes */}
                  {!isRoot && !isLevel1 && (
                    <line
                      x1={node.side === 'left' ? node.width / 2 - 2 : -node.width / 2 + 2}
                      y1={-node.height / 2 + 6}
                      x2={node.side === 'left' ? node.width / 2 - 2 : -node.width / 2 + 2}
                      y2={node.height / 2 - 6}
                      stroke={colorScheme.border}
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                  )}

                  {/* Node Text Label */}
                  <text
                    x={isRoot ? 0 : node.side === 'left' ? -4 : 4}
                    y={hasTag ? -3 : 0}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={textColor}
                    fontSize={fontSize}
                    fontWeight={fontWeight}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    className="select-none pointer-events-none"
                  >
                    {displayText.length > 28 ? displayText.substring(0, 26) + '…' : displayText}
                  </text>

                  {/* Tag Pill */}
                  {hasTag && (
                    <text
                      x={isRoot ? 0 : node.side === 'left' ? -4 : 4}
                      y={10}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={colorScheme.text}
                      fontSize={9}
                      fontWeight="600"
                      className="select-none pointer-events-none opacity-80"
                    >
                      #{node.tag}
                    </text>
                  )}

                  {/* Expand / Collapse Button Indicator (+ / -) */}
                  {node.hasChildren && !isRoot && (
                    <g
                      transform={`translate(${
                        node.side === 'right'
                          ? node.width / 2 + 10
                          : -node.width / 2 - 10
                      }, 0)`}
                      onClick={(e) => toggleCollapse(node.id, e)}
                      className="cursor-pointer group/btn"
                    >
                      <circle
                        r={8}
                        fill={colorScheme.bg}
                        stroke={colorScheme.border}
                        strokeWidth={1.5}
                        className="transition-transform group-hover/btn:scale-125"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={colorScheme.text}
                        fontSize={10}
                        fontWeight="bold"
                        y={-0.5}
                      >
                        {node.isCollapsed ? `+` : `−`}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Bottom Hint Bar */}
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-slate-400 pointer-events-none">
        <span className="bg-white/80 px-2 py-0.5 rounded border border-slate-200/60 shadow-2xs">
          💡 Fare tekerleği ile Yakınlaştır / Sürükleyerek Gezin / Düğümlerde (+) ile Alt Dalları Aç
        </span>
        <span className="hidden sm:inline bg-white/80 px-2 py-0.5 rounded border border-slate-200/60 shadow-2xs font-mono">
          Ölçek: {Math.round(transform.scale * 100)}%
        </span>
      </div>
    </div>
  );
};
