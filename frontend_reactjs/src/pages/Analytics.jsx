import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import { KPICard } from '@/components/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Activity, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { getAlerts, getIncidents } from '@/lib/api';

export default function Analytics() {
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [incidentsByType, setIncidentsByType] = useState([]);
  const [incidentsBySeverity, setIncidentsBySeverity] = useState([]);
  const [timeSeriesData, setTimeSeriesData] = useState([]);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      const [alertsResult, incidentsResult] = await Promise.allSettled([
        getAlerts(),
        getIncidents(),
      ]);

      const alerts = alertsResult.status === 'fulfilled' ? alertsResult.value : [];
      const incidents = incidentsResult.status === 'fulfilled' ? incidentsResult.value : [];

      // Active Alerts Count
      const activeAlerts = alerts.filter(
        (a) => a.priority === 'critical' || a.priority === 'high'
      ).length;
      setActiveAlertsCount(activeAlerts);

      // Incidents by Type
      const typeMap = {};
      incidents.forEach(inc => {
        const type = inc.type || 'Traffic';
        typeMap[type] = (typeMap[type] || 0) + 1;
      });
      setIncidentsByType(Object.entries(typeMap).map(([type, count]) => ({ type, count })));

      // Incidents by Severity
      const severityMap = { Critical: 0, High: 0, Medium: 0, Low: 0 };
      const severityColors = { Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#3b82f6' };

      incidents.forEach(inc => {
        // capitalize first letter
        const severity = inc.severity ? inc.severity.charAt(0).toUpperCase() + inc.severity.slice(1).toLowerCase() : 'Medium';
        if (severityMap[severity] !== undefined) {
          severityMap[severity]++;
        } else {
          // fallback for unknown severities
          severityMap['Medium']++;
        }
      });

      setIncidentsBySeverity(Object.entries(severityMap)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({
          name,
          value,
          color: severityColors[name] || '#94a3b8'
        })));

      // Time Series (Mocking time distribution based on real count for now, as API doesn't give history)
      // In a real app, we'd fetch historical stats. Here we'll distribute current incidents over 24h for visualization
      const now = new Date();
      const timeData = Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(now - (23 - i) * 3600000).toISOString(),
        value: Math.floor(Math.random() * (incidents.length / 5)) // Simulated variation based on real total
      }));
      setTimeSeriesData(timeData);

      // Mock response time data
      const mockResponseTimeData = [
        { day: 'Mon', avgTime: 15 },
        { day: 'Tue', avgTime: 12 },
        { day: 'Wed', avgTime: 18 },
        { day: 'Thu', avgTime: 10 },
        { day: 'Fri', avgTime: 14 },
        { day: 'Sat', avgTime: 8 },
        { day: 'Sun', avgTime: 9 },
      ];

    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const responseTimeData = [
    { day: 'Mon', avgTime: 15 },
    { day: 'Tue', avgTime: 12 },
    { day: 'Wed', avgTime: 18 },
    { day: 'Thu', avgTime: 10 },
    { day: 'Fri', avgTime: 14 },
    { day: 'Sat', avgTime: 8 },
    { day: 'Sun', avgTime: 9 },
  ];

  return (
    <AppShell>
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Incidents by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incidentsByType}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Incidents by Severity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incidentsBySeverity}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {incidentsBySeverity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Average Response Time by Day</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" />
                <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Bar dataKey="avgTime" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Power BI Embedded Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Power BI Dashboard Integration
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Configure VITE_PUBLIC_POWERBI_KEY in environment
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

