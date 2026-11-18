import { useMemo, useRef, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { toPng } from 'html-to-image';
import {
  abcPatterns, activityComparison, dailyCounts, dailyDurationMinutes,
  dayOfWeekCounts, directGoalSeries, goalCurrent, heatmapHours, hourDayHeatmap,
  inRange, lastNDays, linkedGoalSeries, trendDirection,
} from '../../lib/analytics';
import { useData } from '../../lib/store';
import type { Student } from '../../lib/types';

const RANGES = [7, 14, 30, 90] as const;

export default function AnalyticsTab({ student }: { student: Student }) {
  const { behaviors, events, goals, goal_entries, sessions } = useData();
  const [days, setDays] = useState<number>(14);
  const [behaviorId, setBehaviorId] = useState<string>('all');
  const exportRef = useRef<HTMLDivElement>(null);

  const range = useMemo(() => lastNDays(days), [days]);
  const myBehaviors = behaviors.filter(b => b.student_id === student.id);
  const selectedIds = behaviorId === 'all' ? myBehaviors.map(b => b.id) : [behaviorId];
  const myEvents = useMemo(
    () => events.filter(e => e.student_id === student.id
      && selectedIds.includes(e.behavior_id) && inRange(e.occurred_at, range)),
    [events, student.id, behaviorId, days]); // eslint-disable-line react-hooks/exhaustive-deps

  const freq = dailyCounts(myEvents, selectedIds, range);
  const dur = dailyDurationMinutes(myEvents, selectedIds, range);
  const hasDuration = dur.some(d => d.minutes > 0);
  const abc = abcPatterns(myEvents);
  const heat = hourDayHeatmap(myEvents);
  const dow = dayOfWeekCounts(myEvents);
  const activities = activityComparison(myEvents, sessions, range);
  const trend = trendDirection(freq.map(f => f.count));
  const myGoals = goals.filter(g => g.student_id === student.id && g.active);

  async function exportPng() {
    if (!exportRef.current) return;
    const url = await toPng(exportRef.current, { backgroundColor: '#f8fafc', pixelRatio: 2 });
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.code}-analytics-${days}d.png`;
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map(r => (
          <button key={r} onClick={() => setDays(r)}
            className={`min-h-9 rounded-full border px-3 text-sm ${
              days === r ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300'}`}>
            {r}d
          </button>
        ))}
        <select aria-label="Filter by behavior" value={behaviorId} onChange={e => setBehaviorId(e.target.value)}
          className="min-h-9 flex-1 rounded-xl border border-slate-300 bg-white px-2 text-sm">
          <option value="all">All behaviors</option>
          {myBehaviors.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button onClick={() => void exportPng()}
          className="min-h-9 rounded-xl border border-slate-300 px-3 text-sm">PNG ⬇</button>
      </div>

      <div ref={exportRef} className="space-y-4">
        <Card title={`Frequency per day (trend: ${trend})`}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={freq} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#2a78d6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {hasDuration && (
          <Card title="Duration (minutes per day)">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={dur} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="minutes" stroke="#4a3aa7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {myGoals.map(g => {
          const series = g.mode === 'direct'
            ? directGoalSeries(goal_entries.filter(e => e.goal_id === g.id), range)
                .map(r => ({ date: r.date, value: r.pct }))
            : linkedGoalSeries(g, events.filter(e => e.student_id === student.id), range);
          const target = g.mode === 'direct' ? g.criterion_percent : g.criterion_value;
          const cur = goalCurrent(g, events.filter(e => e.student_id === student.id),
            goal_entries.filter(e => e.goal_id === g.id), range);
          return (
            <Card key={g.id} title={`Goal: ${g.title} — ${cur.label}`}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={series} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  {target != null && (
                    <ReferenceLine y={target} stroke="#eda100" strokeDasharray="6 3"
                      label={{ value: 'target', fontSize: 10, fill: '#eda100' }} />
                  )}
                  <Line type="monotone" dataKey="value" stroke="#008300" strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 0 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          );
        })}

        {(abc.antecedents.length > 0 || abc.consequences.length > 0) && (
          <Card title="ABC patterns (function hypothesis)">
            <div className="grid gap-4 sm:grid-cols-2">
              <PatternBars title="Top antecedents" rows={abc.antecedents.slice(0, 6)} color="#eb6834" />
              <PatternBars title="Top consequences" rows={abc.consequences.slice(0, 6)} color="#e34948" />
            </div>
          </Card>
        )}

        <Card title="Time of day × day of week">
          <Heatmap grid={heat} />
        </Card>

        <Card title="Day of week">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={dow} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2a78d6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {activities.length > 0 && (
          <Card title="By activity (events per observed hour)">
            <ul className="space-y-1 text-sm">
              {activities.map(a => (
                <li key={a.activity} className="flex justify-between">
                  <span>{a.activity}</span>
                  <span className="tabular-nums text-slate-500">
                    {a.count}×{a.perHour != null && ` · ${a.perHour}/hr`}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      {children}
    </section>
  );
}

function PatternBars({ title, rows, color }:
  { title: string; rows: { label: string; count: number }[]; color: string }) {
  const max = Math.max(1, ...rows.map(r => r.count));
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold text-slate-500">{title}</h4>
      {rows.length === 0 && <p className="text-xs text-slate-400">No data</p>}
      <ul className="space-y-1">
        {rows.map(r => (
          <li key={r.label} className="text-xs">
            <div className="flex justify-between"><span>{r.label}</span><span>{r.count}</span></div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full" style={{ width: `${(r.count / max) * 100}%`, backgroundColor: color }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Heatmap({ grid }: { grid: number[][] }) {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const hours = heatmapHours(grid);
  const max = Math.max(1, ...hours.flatMap(h => grid.map(row => row[h])));
  return (
    <div className="overflow-x-auto">
      <table className="text-[10px] text-slate-500">
        <thead>
          <tr><th />{hours.map(h => <th key={h} className="px-1 font-normal">{h}</th>)}</tr>
        </thead>
        <tbody>
          {days.map((d, di) => (
            <tr key={di}>
              <td className="pr-1">{d}</td>
              {hours.map(h => {
                const v = grid[di][h];
                return (
                  <td key={h} className="p-0.5">
                    <div title={`${v} events`} className="h-5 w-6 rounded"
                      style={{ backgroundColor: v === 0 ? '#f1f5f9' : `rgba(42, 120, 214, ${0.25 + 0.75 * (v / max)})` }} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
