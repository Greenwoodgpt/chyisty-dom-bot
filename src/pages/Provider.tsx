import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Wrench, 
  Wallet, 
  Bell, 
  Settings, 
  MapPin, 
  Clock, 
  Star,
  TrendingUp,
  Home,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  bags?: any;
  comment?: string;
}

type ViewMode = 'main' | 'new_orders' | 'my_orders' | 'wallet' | 'notifications' | 'settings';

const Provider = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('main');
  const [orders, setOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    rating: 4.8,
    completed: 23,
    balance: 1250
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

      const allOrders = data || [];
      setOrders(allOrders.filter(order => order.status === 'new'));
      setMyOrders(allOrders.filter(order => order.status === 'in_work' || order.status === 'completed'));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const takeOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'in_work' })
        .eq('id', orderId);

      if (error) throw error;
      await fetchOrders();
    } catch (error) {
      console.error('Error taking order:', error);
    }
  };

  const completeOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      if (error) throw error;
      await fetchOrders();
    } catch (error) {
      console.error('Error completing order:', error);
    }
  };

  const getSizeText = (size: string) => {
    switch (size) {
      case 'one_bag':
        return '1 пакет';
      case 'two_bags':
        return '2 пакета';
      case 'three_bags':
        return '3 пакета';
      default:
        return size;
    }
  };

  const getTimeText = (timeOption: string, customTime?: string) => {
    switch (timeOption) {
      case 'within_hour':
        return '(срочно)';
      case 'tomorrow_morning':
        return '(утром)';
      case 'custom':
        return customTime ? `(${customTime})` : '(по договорённости)';
      default:
        return '';
    }
  };

  const renderMainMenu = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 rounded-xl p-6 border border-primary/20">
        <h1 className="text-2xl font-bold">Добро пожаловать, герой чистоты! 🦸‍♂️</h1>
        <p className="text-muted-foreground">Готов к новым подвигам по выносу мусора?</p>
        
        <div className="flex items-center justify-center gap-6 text-sm mt-4">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="font-medium">{stats.rating}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="font-medium">{stats.completed} заказов</span>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="font-medium">{stats.balance}₽</span>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-lg mb-6 font-medium">👉 Выбери, что тебе интересно сейчас:</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 border-primary/20" onClick={() => setCurrentView('new_orders')}>
          <CardHeader className="text-center">
            <Package className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">📦 Посмотреть новые заказы</CardTitle>
            <CardDescription>Свежие задачки рядом с тобой</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 border-primary/20" onClick={() => setCurrentView('my_orders')}>
          <CardHeader className="text-center">
            <Wrench className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">🛠 Мои заказы</CardTitle>
            <CardDescription>В работе и выполненные</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 border-primary/20" onClick={() => setCurrentView('wallet')}>
          <CardHeader className="text-center">
            <Wallet className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">💰 Кошелёк</CardTitle>
            <CardDescription>Баланс, история, вывод средств</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 border-primary/20" onClick={() => setCurrentView('settings')}>
          <CardHeader className="text-center">
            <Settings className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">⚙️ Настройки</CardTitle>
            <CardDescription>Профиль, город, график</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );

  const renderNewOrders = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Вот свежие задачки рядом с тобой 👇</h2>
        <Button variant="outline" onClick={() => setCurrentView('main')}>
          <Home className="h-4 w-4 mr-2" />
          На главную
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Пока нет новых заказов 😴</p>
            <p className="text-sm text-muted-foreground mt-2">Отдохни, скоро появятся новые задачки!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order, index) => (
            <Card key={order.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      🏠 Адрес: {order.address}
                    </h3>
                    <p className="text-muted-foreground">
                      {getSizeText(order.size_option)} {getTimeText(order.time_option, order.custom_time)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    {order.amount / 100}₽
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(order.created_at).toLocaleString('ru-RU')}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {order.first_name} {order.last_name}
                  </div>
                </div>

                <Button 
                  onClick={() => takeOrder(order.id)} 
                  className="w-full"
                >
                  ⚡ Взять в работу
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderMyOrders = () => {
    const inWork = myOrders.filter(order => order.status === 'in_work');
    const completed = myOrders.filter(order => order.status === 'completed');

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Твои текущие дела:</h2>
          <Button variant="outline" onClick={() => setCurrentView('main')}>
            <Home className="h-4 w-4 mr-2" />
            На главную
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-orange-600">🔥 В работе</h3>
            {inWork.length === 0 ? (
              <p className="text-muted-foreground">Нет заказов в работе</p>
            ) : (
              <div className="space-y-3">
                {inWork.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">🏠 {order.address}</p>
                          <p className="text-sm text-muted-foreground">
                            {getSizeText(order.size_option)} — {order.amount / 100}₽
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => completeOrder(order.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          ✅ Выполнено
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-green-600">✅ Выполненные</h3>
            {completed.length === 0 ? (
              <p className="text-muted-foreground">Пока нет выполненных заказов</p>
            ) : (
              <div className="space-y-3">
                {completed.slice(0, 5).map((order) => (
                  <Card key={order.id} className="bg-green-50">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">🏠 {order.address}</p>
                          <p className="text-sm text-muted-foreground">
                            {getSizeText(order.size_option)} — {order.amount / 100}₽
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          Завершён
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderWallet = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">💰 Твой кошелёк</h2>
        <Button variant="outline" onClick={() => setCurrentView('main')}>
          <Home className="h-4 w-4 mr-2" />
          На главную
        </Button>
      </div>

      <Card className="bg-gradient-to-r from-green-50 to-blue-50">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-green-600">{stats.balance}₽</CardTitle>
          <CardDescription>Твой текущий баланс</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button size="lg" className="h-16">
          💳 Вывести средства
        </Button>
        <Button variant="outline" size="lg" className="h-16">
          📊 История операций
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние поступления:</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span>+150₽ за Пушкина 10</span>
            <span className="text-sm text-muted-foreground">Сегодня</span>
          </div>
          <div className="flex justify-between items-center">
            <span>+300₽ за Ленина 25</span>
            <span className="text-sm text-muted-foreground">Вчера</span>
          </div>
          <div className="flex justify-between items-center">
            <span>+200₽ за Гагарина 7</span>
            <span className="text-sm text-muted-foreground">2 дня назад</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">⚙️ Настройки</h2>
        <Button variant="outline" onClick={() => setCurrentView('main')}>
          <Home className="h-4 w-4 mr-2" />
          На главную
        </Button>
      </div>

      <div className="space-y-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MapPin className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold">🗺️ Город</h3>
                <p className="text-sm text-muted-foreground">Москва</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold">⏰ График работы</h3>
                <p className="text-sm text-muted-foreground">Ежедневно 9:00 - 18:00</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold">📩 Уведомления</h3>
                <p className="text-sm text-muted-foreground">Включены</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold">🏆 Мой рейтинг</h3>
                <p className="text-sm text-muted-foreground">{stats.rating} ⭐ ({stats.completed} заказов)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button variant="destructive" className="w-full">
          🚪 Выйти из аккаунта
        </Button>
      </div>
    </div>
  );

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
      <div className="container mx-auto max-w-4xl">
        {currentView === 'main' && renderMainMenu()}
        {currentView === 'new_orders' && renderNewOrders()}
        {currentView === 'my_orders' && renderMyOrders()}
        {currentView === 'wallet' && renderWallet()}
        {currentView === 'settings' && renderSettings()}
      </div>
    </div>
  );
};

export default Provider;