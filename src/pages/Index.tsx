import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Package, Clock, MapPin, Users, BarChart3 } from "lucide-react";

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

const Index = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    completed: 0,
    revenue: 0
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
      
      // Подсчет статистики
      const total = data?.length || 0;
      const newOrders = data?.filter(order => order.status === 'new').length || 0;
      const completed = data?.filter(order => order.status === 'completed').length || 0;
      const revenue = data?.reduce((sum, order) => sum + (order.amount / 100), 0) || 0;
      
      setStats({ total, new: newOrders, completed, revenue });
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      await fetchOrders(); // Перезагружаем данные
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="default">Новый</Badge>;
      case 'in_work':
        return <Badge variant="secondary">В работе</Badge>;
      case 'completed':
        return <Badge variant="outline">Завершен</Badge>;
      default:
        return <Badge variant="destructive">Отменен</Badge>;
    }
  };

  const getSizeText = (size: string) => {
    switch (size) {
      case 'one_bag':
        return 'Один пакет (до 6 кг)';
      case 'two_bags':
        return 'Два пакета';
      case 'three_bags':
        return 'Три пакета';
      default:
        return size;
    }
  };

  const getTimeText = (timeOption: string, customTime?: string) => {
    switch (timeOption) {
      case 'within_hour':
        return 'В течение часа';
      case 'tomorrow_morning':
        return 'Завтра утром';
      case 'custom':
        return customTime || 'Указанное время';
      default:
        return timeOption;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Truck className="h-8 w-8 text-primary" />
            CRM - Вывоз мусора
          </h1>
          <p className="text-muted-foreground">Панель управления заказами</p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего заказов</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Новые</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.new}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Завершено</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Доход</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.revenue.toFixed(0)}₽</div>
            </CardContent>
          </Card>
        </div>

        {/* Список заказов */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Заказы</h2>
          
          {orders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Заказов пока нет</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        Заказ #{order.id.slice(-8)}
                      </CardTitle>
                      <CardDescription>
                        {new Date(order.created_at).toLocaleString('ru-RU')}
                      </CardDescription>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{order.first_name} {order.last_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.username ? `@${order.username}` : 'Username не указан'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Адрес</p>
                        <p className="text-sm text-muted-foreground">{order.address}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{getSizeText(order.size_option)}</p>
                        <p className="text-sm text-muted-foreground">{order.amount / 100}₽</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Время</p>
                        <p className="text-sm text-muted-foreground">
                          {getTimeText(order.time_option, order.custom_time)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {order.status === 'new' && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateOrderStatus(order.id, 'in_work')}
                      >
                        В работу
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                      >
                        Завершить
                      </Button>
                    </div>
                  )}
                  
                  {order.status === 'in_work' && (
                    <Button 
                      size="sm" 
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                    >
                      Завершить
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
