import { Box, Paper, Typography } from '@mui/material';
import { CommitmentPromise, GroupMember } from '../types';

interface ProportionalCommitmentGraphProps {
  promise: CommitmentPromise;
  groupMembers?: GroupMember[];
  width?: number;
  height?: number;
}

export function ProportionalCommitmentGraph({ 
  promise, 
  groupMembers,
  width = 300, 
  height = 200 
}: ProportionalCommitmentGraphProps) {
  // Only show graph for proportional promises
  if (promise.proportionalAmount === 0 || !promise.referenceAction) {
    return null;
  }

  // Determine reference user name
  let refUser = 'all users combined';
  if (promise.referenceUserId && groupMembers) {
    const refMember = groupMembers.find(m => m.userId === promise.referenceUserId);
    refUser = refMember?.username || promise.referenceUserId;
  } else if (promise.referenceUserId) {
    refUser = promise.referenceUserId;
  }

  const padding = 40;
  const graphWidth = width - 2 * padding;
  const graphHeight = height - 2 * padding;

  // Calculate key points for the graph
  const threshold = promise.thresholdAmount || 0;
  const maxX = promise.maxAmount 
    ? Math.max(threshold + 20, (promise.maxAmount - promise.baseAmount) / promise.proportionalAmount + threshold)
    : threshold + 20;
  const maxY = promise.maxAmount || (promise.baseAmount + promise.proportionalAmount * (maxX - threshold));

  // Convert data coordinates to SVG coordinates
  const toSvgX = (x: number) => padding + (x / maxX) * graphWidth;
  const toSvgY = (y: number) => height - padding - (y / maxY) * graphHeight;

  // Build path for the promise line
  let pathData = '';
  
  if (promise.baseAmount > 0 && threshold > 0) {
    // Flat at baseAmount until threshold, then increase
    pathData = `M ${toSvgX(0)} ${toSvgY(promise.baseAmount)} L ${toSvgX(threshold)} ${toSvgY(promise.baseAmount)}`;
    if (promise.maxAmount) {
      const xAtMax = threshold + (promise.maxAmount - promise.baseAmount) / promise.proportionalAmount;
      pathData += ` L ${toSvgX(xAtMax)} ${toSvgY(promise.maxAmount)} L ${toSvgX(maxX)} ${toSvgY(promise.maxAmount)}`;
    } else {
      pathData += ` L ${toSvgX(maxX)} ${toSvgY(promise.baseAmount + promise.proportionalAmount * (maxX - threshold))}`;
    }
  } else if (promise.baseAmount > 0) {
    // Start at baseAmount, increase from 0
    pathData = `M ${toSvgX(0)} ${toSvgY(promise.baseAmount)}`;
    if (promise.maxAmount) {
      const xAtMax = (promise.maxAmount - promise.baseAmount) / promise.proportionalAmount;
      pathData += ` L ${toSvgX(xAtMax)} ${toSvgY(promise.maxAmount)} L ${toSvgX(maxX)} ${toSvgY(promise.maxAmount)}`;
    } else {
      pathData += ` L ${toSvgX(maxX)} ${toSvgY(promise.baseAmount + promise.proportionalAmount * maxX)}`;
    }
  } else {
    // Pure proportional from 0
    pathData = `M ${toSvgX(0)} ${toSvgY(0)}`;
    if (promise.maxAmount) {
      const xAtMax = promise.maxAmount / promise.proportionalAmount;
      pathData += ` L ${toSvgX(xAtMax)} ${toSvgY(promise.maxAmount)} L ${toSvgX(maxX)} ${toSvgY(promise.maxAmount)}`;
    } else {
      pathData += ` L ${toSvgX(maxX)} ${toSvgY(promise.proportionalAmount * maxX)}`;
    }
  }

  // X-axis ticks
  const xTicks = [0, threshold, maxX].filter((x): x is number => x > 0);
  const yTicks = [0, promise.baseAmount, promise.maxAmount, maxY].filter((y): y is number => y !== undefined && y > 0);

  return (
    <Paper elevation={1} sx={{ p: 2, mt: 2 }}>
      <Typography variant="caption" color="text.secondary" gutterBottom>
        Proportional Promise Visualization
      </Typography>
      <Box sx={{ position: 'relative' }}>
        <svg width={width} height={height} style={{ border: '1px solid #e0e0e0', borderRadius: '4px' }}>
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width={graphWidth} height={graphHeight} x={padding} y={padding} fill="url(#grid)" />
          
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
          
          {/* Key points */}
          {promise.baseAmount > 0 && (
            <circle cx={toSvgX(0)} cy={toSvgY(promise.baseAmount)} r="4" fill="#FF6B35" />
          )}
          {threshold > 0 && promise.baseAmount > 0 && (
            <circle cx={toSvgX(threshold)} cy={toSvgY(promise.baseAmount)} r="4" fill="#FF6B35" />
          )}
          {promise.maxAmount && (
            <circle 
              cx={toSvgX(threshold + (promise.maxAmount - promise.baseAmount) / promise.proportionalAmount)} 
              cy={toSvgY(promise.maxAmount)} 
              r="4" 
              fill="#FF6B35" 
            />
          )}
          
          {/* X-axis label */}
          <text 
            x={width / 2} 
            y={height - 5} 
            textAnchor="middle" 
            fontSize="12" 
            fill="#666"
          >
            {promise.referenceAction} by {refUser} ({promise.unit})
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
      
      {/* Legend */}
      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {promise.baseAmount > 0 && (
          <Typography variant="caption" color="text.secondary">
            Base: {promise.baseAmount} {promise.unit}
          </Typography>
        )}
        {threshold > 0 && (
          <Typography variant="caption" color="text.secondary">
            Threshold: {threshold} {promise.unit}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          Ratio: {promise.proportionalAmount}×
        </Typography>
        {promise.maxAmount && (
          <Typography variant="caption" color="text.secondary">
            Max: {promise.maxAmount} {promise.unit}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
