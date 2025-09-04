import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Package, Users, Calendar, Clock, MapPin, ArrowLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Order {
  id: string;
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  address: string;
  size_option: string;
  time_option: string;
  custom_time: string;
  amount: number;
  status: string;
  created_at: string;
}

interface DayStats {
  date: string;
  orders: number;
  revenue: number;
}

interface SizeStats {
  name: string;
  count: number;
  revenue: number;
}

const Analytics = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayStats, setDayStats] = useState<DayStats[]>([]);
  const [sizeStats, setSizeStats] = useState<SizeStats[]>([]);
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    fetchOrders();
  }, [timeFilter]);

  const fetchOrders = async () => {
    try {
      let query = supabase.from('orders').select('*');

      // Применяем фильтр по времени
      if (timeFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (timeFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
      processAnalytics(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalytics = (ordersData: Order[]) => {
    // Статистика по дням
    const dayStatsMap = new Map<string, { orders: number; revenue: number }>();
    
    ordersData.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      const current = dayStatsMap.get(date) || { orders: 0, revenue: 0 };
      dayStatsMap.set(date, {
        orders: current.orders + 1,
        revenue: current.revenue + (order.amount / 100)
      });
    });

    const dayStatsArray = Array.from(dayStatsMap.entries())
      .map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        ...stats
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setDayStats(dayStatsArray);

    // Статистика по размерам
    const sizeStatsMap = new Map<string, { count: number; revenue: number }>();
    
    ordersData.forEach(order => {
      const current = sizeStatsMap.get(order.size_option) || { count: 0, revenue: 0 };
      sizeStatsMap.set(order.size_option, {
        count: current.count + 1,
        revenue: current.revenue + (order.amount / 100)
      });
    });

    const sizeStatsArray = Array.from(sizeStatsMap.entries()).map(([size, stats]) => ({
      name: getSizeText(size),
      ...stats
    }));

    setSizeStats(sizeStatsArray);
  };

  const getSizeText = (size: string) => {
    switch (size) {
      case 'one_bag':
        return 'Один пакет';
      case 'two_bags':
        return 'Два пакета';
      case 'three_bags':
        return 'Три пакета';
      default:
        return size;
    }
  };

  const getOverallStats = () => {
    const total = orders.length;
    const revenue = orders.reduce((sum, order) => sum + (order.amount / 100), 0);
    const newOrders = orders.filter(order => order.status === 'new').length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const averageOrderValue = total > 0 ? revenue / total : 0;

    return { total, revenue, newOrders, completedOrders, averageOrderValue };
  };

  const stats = getOverallStats();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка аналитики...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к заказам
        </Button>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Аналитика
          </h1>
          <p className="text-muted-foreground">Статистика заказов и доходов</p>
        </div>

        {/* Фильтры */}
        <div className="mb-6">
          <div className="flex gap-2">
            <Button
              variant={timeFilter === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFilter('week')}
            >
              За неделю
            </Button>
            <Button
              variant={timeFilter === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFilter('month')}
            >
              За месяц
            </Button>
            <Button
              variant={timeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFilter('all')}
            >
              Все время
            </Button>
          </div>
        </div>

        {/* Общая статистика */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего заказов</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Общий доход</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.revenue.toFixed(0)}₽</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Новые</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.newOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Завершено</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completedOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Средний чек</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageOrderValue.toFixed(0)}₽</div>
            </CardContent>
          </Card>
        </div>

        {/* Графики */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* График заказов по дням */}
          <Card>
            <CardHeader>
              <CardTitle>Заказы по дням</CardTitle>
              <CardDescription>Количество заказов и доходы по дням</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dayStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="orders" fill="#8884d8" name="Заказы" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Доход (₽)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Распределение по размерам */}
          <Card>
            <CardHeader>
              <CardTitle>Распределение по размерам</CardTitle>
              <CardDescription>Популярность размеров заказов</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sizeStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, count }) => `${name}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {sizeStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Детальная статистика по размерам */}
        <Card>
          <CardHeader>
            <CardTitle>Статистика по типам заказов</CardTitle>
            <CardDescription>Подробная информация о популярности и доходности</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sizeStats.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.count} заказов</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{item.revenue.toFixed(0)}₽</p>
                    <p className="text-sm text-muted-foreground">
                      {((item.count / stats.total) * 100).toFixed(1)}% от общего
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;