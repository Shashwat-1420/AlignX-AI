'use client';

import React from 'react';
import { SmartAnalysis } from '../ai/smart-analysis';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

interface AIInsightsPanelProps {
  analysis: SmartAnalysis;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ analysis }) => {
  const scorePercentage = Math.min(
    100,
    Math.max(0, analysis.qualityScore || 0)
  );

  const getRiskStyles = () => {
    switch (analysis.riskLabel) {
      case 'on_track':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'at_risk':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'off_track':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  return (
    <Card className="w-full border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              AI SMART Insights
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Goal quality and execution analysis
            </p>
          </div>

          <Badge className={getRiskStyles()}>
            {analysis.riskLabel.replace('_', ' ')}
          </Badge>
        </div>

        {/* SMART Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">
              SMART Quality Score
            </span>

            <span className="text-2xl font-bold text-white">
              {scorePercentage}%
            </span>
          </div>

          <Progress value={scorePercentage} />
        </div>

        {/* Goal Signals */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Specificity
            </p>

            <p className="mt-2 text-sm font-medium text-white">
              {analysis.isVague ? 'Needs Improvement' : 'Well Defined'}
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Measurable
            </p>

            <p className="mt-2 text-sm font-medium text-white">
              {analysis.hasMeasurableLanguage ? 'Detected' : 'Missing Metrics'}
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Time Bound
            </p>

            <p className="mt-2 text-sm font-medium text-white">
              {analysis.hasTimeBoundLanguage ? 'Defined' : 'No Timeline'}
            </p>
          </div>
        </div>

        {/* Suggestions */}
        {analysis.suggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">
              Improvement Suggestions
            </h4>

            <div className="space-y-2">
              {analysis.suggestions.map(
                (suggestion: string, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-md border border-amber-500/10 bg-amber-500/5 p-3 text-sm text-slate-300"
                  >
                    {suggestion}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Rewrite */}
        {analysis.smartRewrite && (
          <div className="rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-4">
            <p className="mb-2 text-sm font-semibold text-blue-300">
              ✨ AI Suggested Rewrite
            </p>

            <p className="text-sm leading-relaxed text-slate-200">
              {analysis.smartRewrite}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};