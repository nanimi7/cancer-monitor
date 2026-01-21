import { useEffect, useState } from 'react';

function PushNotification() {
  const [permission, setPermission] = useState(Notification.permission);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeToPush();
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;

      // VAPID public key는 Firebase Console에서 가져와야 합니다
      // 현재는 로컬 알림만 사용하도록 설정
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          // 실제 사용시에는 Firebase Console에서 VAPID 키를 가져와서 여기에 넣어야 합니다
          'YOUR_VAPID_PUBLIC_KEY_HERE'
        )
      });

      setSubscription(sub);
      console.log('Push subscription:', sub);

      // TODO: 서버에 subscription 정보 저장

    } catch (error) {
      console.error('Error subscribing to push:', error);
      alert('푸시 알림 구독에 실패했습니다. Firebase 설정을 확인해주세요.');
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        setSubscription(null);
        console.log('Unsubscribed from push notifications');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }
  };

  // Helper function to convert VAPID key
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // 테스트용 로컬 알림
  const sendTestNotification = () => {
    if (permission === 'granted') {
      new Notification('항암기록 테스트 알림', {
        body: '푸시 알림이 정상적으로 작동합니다!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      });
    } else {
      alert('알림 권한이 필요합니다.');
    }
  };

  return {
    permission,
    subscription,
    requestPermission,
    unsubscribeFromPush,
    sendTestNotification
  };
}

export default PushNotification;
