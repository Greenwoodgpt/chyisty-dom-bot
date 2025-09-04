import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Users, MapPin, Package, Clock, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  updated_at: string;
}

const OrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить информацию о заказе",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    if (!order) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', order.id);

      if (error) throw error;
      
      setOrder({ ...order, status: newStatus });
      toast({
        title: "Статус обновлен",
        description: `Заказ переведен в статус: ${getStatusText(newStatus)}`,
      });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус заказа",
        variant: "destructive",
      });
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return 'Новый';
      case 'in_work':
        return 'В работе';
      case 'completed':
        return 'Завершен';
      default:
        return 'Отменен';
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

  if (!order) {
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
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Заказ не найден</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к заказам
        </Button>

        <div className="space-y-6">
          {/* Заголовок */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">
                    Заказ #{order.id.slice(-8)}
                  </CardTitle>
                  <CardDescription>
                    Создан: {new Date(order.created_at).toLocaleString('ru-RU')}
                  </CardDescription>
                  <CardDescription>
                    Обновлен: {new Date(order.updated_at).toLocaleString('ru-RU')}
                  </CardDescription>
                </div>
                {getStatusBadge(order.status)}
              </div>
            </CardHeader>
          </Card>

          {/* Информация о клиенте */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Информация о клиенте
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Имя</p>
                  <p className="text-lg">{order.first_name} {order.last_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Username</p>
                  <p className="text-lg">{order.username ? `@${order.username}` : 'Не указан'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ID пользователя</p>
                  <p className="text-lg">{order.user_id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Детали заказа */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Детали заказа
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Адрес</p>
                      <p className="text-lg">{order.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Объем</p>
                      <p className="text-lg">{getSizeText(order.size_option)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Время вывоза</p>
                      <p className="text-lg">{getTimeText(order.time_option, order.custom_time)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Стоимость</p>
                    <p className="text-2xl font-bold text-primary">{order.amount / 100}₽</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Управление статусом */}
          <Card>
            <CardHeader>
              <CardTitle>Управление заказом</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {order.status === 'new' && (
                    <>
                      <Button 
                        variant="outline"
                        onClick={() => updateOrderStatus('in_work')}
                      >
                        Взять в работу
                      </Button>
                      <Button 
                        onClick={() => updateOrderStatus('completed')}
                      >
                        Завершить заказ
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => updateOrderStatus('cancelled')}
                      >
                        Отменить заказ
                      </Button>
                    </>
                  )}
                  
                  {order.status === 'in_work' && (
                    <>
                      <Button 
                        onClick={() => updateOrderStatus('completed')}
                      >
                        Завершить заказ
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => updateOrderStatus('cancelled')}
                      >
                        Отменить заказ
                      </Button>
                    </>
                  )}
                  
                  {(order.status === 'completed' || order.status === 'cancelled') && (
                    <Button 
                      variant="outline"
                      onClick={() => updateOrderStatus('new')}
                    >
                      Вернуть в новые
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Комментарии */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Комментарии
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="Добавить комментарий к заказу..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={() => {
                    // Здесь можно добавить сохранение комментария в будущем
                    toast({
                      title: "Комментарий добавлен",
                      description: "Функционал комментариев будет добавлен в следующей версии",
                    });
                    setComment("");
                  }}
                  disabled={!comment.trim()}
                >
                  Добавить комментарий
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;