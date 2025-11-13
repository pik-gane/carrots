import { useState, useRef, useEffect } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { CommitmentPromise, GroupMember } from '../types';

interface InteractiveProportionalGraphProps {
  promise: CommitmentPromise;
  groupMembers?: GroupMember[];
  onUpdate: (updates: Partial<CommitmentPromise>) => void;
  width?: number;
  height?: number;
}

export function InteractiveProportionalGraph({ 
  promise, 
  groupMembers,
  onUpdate,
  width = 400, 
  height = 300 
}: InteractiveProportionalGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  // Determine reference user name
  let refUser = 'all users combined';
  if (promise.referenceUserId && groupMembers) {
    const refMember = groupMembers.find(m => m.userId === promise.referenceUserId);
    refUser = refMember?.username || promise.referenceUserId;
  } else if (promise.referenceUserId) {
    refUser = promise.referenceUserId;
  }

  const padding = 50;
  const graphWidth = width - 2 * padding;
  const graphHeight = height - 2 * padding;

  // Calculate key points for the graph
  const threshold = promise.thresholdAmount || 0;
  const baseAmount = promise.baseAmount || 0;
  const proportionalAmount = promise.proportionalAmount || 1;
  const maxAmount = promise.maxAmount || 0;

  // Auto-scale the graph
  const maxX = maxAmount && proportionalAmount > 0
    ? Math.max(threshold + 20, (maxAmount - baseAmount) / proportionalAmount + threshold, 10)
    : Math.max(threshold + 20, 10);
  const maxY = maxAmount || Math.max(baseAmount + proportionalAmount * (maxX - threshold), 10);

  // Convert data coordinates to SVG coordinates
  const toSvgX = (x: number) => padding + (x / maxX) * graphWidth;
  const toSvgY = (y: number) => height - padding - (y / maxY) * graphHeight;
  
  // Convert SVG coordinates back to data coordinates
  const fromSvgX = (x: number) => ((x - padding) / graphWidth) * maxX;
  const fromSvgY = (y: number) => ((height - padding - y) / graphHeight) * maxY;

  // Build path for the promise line
  let pathData = '';
  let points: { x: number; y: number; type: string }[] = [];
  
  if (baseAmount > 0 && threshold > 0) {
    // Flat at baseAmount until threshold, then increase
    points.push({ x: 0, y: baseAmount, type: 'start' });
    points.push({ x: threshold, y: baseAmount, type: 'threshold' });
    if (maxAmount) {
      const xAtMax = threshold + (maxAmount - baseAmount) / proportionalAmount;
      points.push({ x: xAtMax, y: maxAmount, type: 'max' });
      pathData = `M ${toSvgX(0)} ${toSvgY(baseAmount)} L ${toSvgX(threshold)} ${toSvgY(baseAmount)} L ${toSvgX(xAtMax)} ${toSvgY(maxAmount)} L ${toSvgX(maxX)} ${toSvgY(maxAmount)}`;
    } else {
      const endY = baseAmount + proportionalAmount * (maxX - threshold);
      pathData = `M ${toSvgX(0)} ${toSvgY(baseAmount)} L ${toSvgX(threshold)} ${toSvgY(baseAmount)} L ${toSvgX(maxX)} ${toSvgY(endY)}`;
      points.push({ x: maxX, y: endY, type: 'end' });
    }
  } else if (baseAmount > 0) {
    // Start at baseAmount, increase from 0
    points.push({ x: 0, y: baseAmount, type: 'base' });
    if (maxAmount) {
      const xAtMax = (maxAmount - baseAmount) / proportionalAmount;
      points.push({ x: xAtMax, y: maxAmount, type: 'max' });
      pathData = `M ${toSvgX(0)} ${toSvgY(baseAmount)} L ${toSvgX(xAtMax)} ${toSvgY(maxAmount)} L ${toSvgX(maxX)} ${toSvgY(maxAmount)}`;
    } else {
      const endY = baseAmount + proportionalAmount * maxX;
      pathData = `M ${toSvgX(0)} ${toSvgY(baseAmount)} L ${toSvgX(maxX)} ${toSvgY(endY)}`;
      points.push({ x: maxX, y: endY, type: 'end' });
    }
  } else {
    // Pure proportional from 0
    points.push({ x: 0, y: 0, type: 'start' });
    if (maxAmount) {
      const xAtMax = maxAmount / proportionalAmount;
      points.push({ x: xAtMax, y: maxAmount, type: 'max' });
      pathData = `M ${toSvgX(0)} ${toSvgY(0)} L ${toSvgX(xAtMax)} ${toSvgY(maxAmount)} L ${toSvgX(maxX)} ${toSvgY(maxAmount)}`;
    } else {
      const endY = proportionalAmount * maxX;
      pathData = `M ${toSvgX(0)} ${toSvgY(0)} L ${toSvgX(maxX)} ${toSvgY(endY)}`;
      points.push({ x: maxX, y: endY, type: 'end' });
    }
  }

  const handleMouseDown = (pointType: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(pointType);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;
    const dataX = Math.max(0, fromSvgX(svgX));
    const dataY = Math.max(0, fromSvgY(svgY));

    const updates: Partial<CommitmentPromise> = {};

    if (dragging === 'base' || dragging === 'start') {
      updates.baseAmount = Math.max(0, Math.round(dataY * 10) / 10);
    } else if (dragging === 'threshold') {
      const newThreshold = Math.max(0, Math.round(dataX * 10) / 10);
      updates.thresholdAmount = newThreshold;
    } else if (dragging === 'max') {
      const newMax = Math.max(baseAmount, Math.round(dataY * 10) / 10);
      updates.maxAmount = newMax;
      // The x position adjusts automatically based on the ratio
    } else if (dragging === 'end' && !maxAmount) {
      // Dragging the end point changes the ratio
      const deltaX = maxX - threshold;
      const deltaY = dataY - baseAmount;
      if (deltaX > 0) {
        const newRatio = Math.max(0, Math.round((deltaY / deltaX) * 100) / 100);
        updates.proportionalAmount = newRatio;
      }
    }

    onUpdate(updates);
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setDragging(null);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // X-axis ticks
  const xTicks = [0, threshold, maxAmount && proportionalAmount > 0 ? threshold + (maxAmount - baseAmount) / proportionalAmount : maxX]
    .filter((x): x is number => x !== undefined && x > 0 && x <= maxX);
  const yTicks = [0, baseAmount, maxAmount, maxY]
    .filter((y): y is number => y !== undefined && y > 0);

  return (
    <Paper elevation={1} sx={{ p: 2, mt: 2 }}>
      <Typography variant="caption" color="text.secondary" gutterBottom>
        Interactive Proportional Promise Graph - Drag points to adjust values
      </Typography>
      <Box sx={{ position: 'relative', userSelect: 'none' }}>
        <svg 
          ref={svgRef}
          width={width} 
          height={height} 
          style={{ border: '1px solid #e0e0e0', borderRadius: '4px', cursor: dragging ? 'grabbing' : 'default' }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid lines */}
          <defs>
            <pattern id="interactive-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width={graphWidth} height={graphHeight} x={padding} y={padding} fill="url(#interactive-grid)" />
          
          {/* Axes */}
          <line 
            x1={padding} 
            y1={height - padding} 
            x2={width - padding} 
            y2={height - padding} 
            stroke="#666" 
            strokeWidth="2"
          />
          <line 
            x1={padding} 
            y1={padding} 
            x2={padding} 
            y2={height - padding} 
            stroke="#666" 
            strokeWidth="2"
          />
          
          {/* Promise line */}
          <path 
            d={pathData} 
            fill="none" 
            stroke="#FF6B35" 
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Interactive points */}
          {points.map((point, idx) => {
            const isDraggable = point.type !== 'end' || !maxAmount;
            return (
              <g key={idx}>
                <circle 
                  cx={toSvgX(point.x)} 
                  cy={toSvgY(point.y)} 
                  r="8" 
                  fill={isDraggable ? "#FF6B35" : "#999"}
                  stroke="white"
                  strokeWidth="2"
                  style={{ cursor: isDraggable ? 'grab' : 'default' }}
                  onMouseDown={isDraggable ? handleMouseDown(point.type) : undefined}
                />
                <text
                  x={toSvgX(point.x)}
                  y={toSvgY(point.y) - 15}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#FF6B35"
                  fontWeight="bold"
                >
                  {point.type === 'base' || point.type === 'start' ? `Base: ${point.y.toFixed(1)}` :
                   point.type === 'threshold' ? `Threshold: ${point.x.toFixed(1)}` :
                   point.type === 'max' ? `Max: ${point.y.toFixed(1)}` : ''}
                </text>
              </g>
            );
          })}
          
          {/* X-axis label */}
          <text 
            x={width / 2} 
            y={height - 5} 
            textAnchor="middle" 
            fontSize="12" 
            fill="#666"
          >
            {promise.referenceAction || 'reference action'} by {refUser} ({promise.unit})
          </text>
          
          {/* Y-axis label */}
          <text 
            x={10} 
            y={height / 2} 
            textAnchor="middle" 
            fontSize="12" 
            fill="#666"
            transform={`rotate(-90 10 ${height / 2})`}
          >
            {promise.action} ({promise.unit})
          </text>
          
          {/* Axis tick labels */}
          {xTicks.map((tick) => (
            <text 
              key={`x-${tick}`}
              x={toSvgX(tick)} 
              y={height - padding + 15} 
              textAnchor="middle" 
              fontSize="10" 
              fill="#666"
            >
              {tick.toFixed(1)}
            </text>
          ))}
          {yTicks.map((tick) => (
            <text 
              key={`y-${tick}`}
              x={padding - 5} 
              y={toSvgY(tick)} 
              textAnchor="end" 
              fontSize="10" 
              fill="#666"
              dominantBaseline="middle"
            >
              {tick.toFixed(1)}
            </text>
          ))}
        </svg>
      </Box>
      
      {/* Legend with current values */}
      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {baseAmount > 0 && (
          <Typography variant="caption" color="text.secondary">
            <strong>Base:</strong> {baseAmount.toFixed(1)} {promise.unit}
          </Typography>
        )}
        {threshold > 0 && (
          <Typography variant="caption" color="text.secondary">
            <strong>Threshold:</strong> {threshold.toFixed(1)} {promise.unit}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          <strong>Ratio:</strong> {proportionalAmount.toFixed(2)}×
        </Typography>
        {maxAmount && maxAmount > 0 && (
          <Typography variant="caption" color="text.secondary">
            <strong>Max:</strong> {maxAmount.toFixed(1)} {promise.unit}
          </Typography>
        )}
      </Box>
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
        Tip: Drag the orange points to adjust base amount, threshold, and maximum values. 
        {!maxAmount && ' Drag the end point to adjust the proportional ratio.'}
      </Typography>
    </Paper>
  );
}
