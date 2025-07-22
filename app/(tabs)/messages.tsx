
import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
  isCurrentUser: boolean;
}

interface CircleChat {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

export default function MessagesScreen() {
  const { texts, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const [selectedChat, setSelectedChat] = useState<CircleChat | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const [circles, setCircles] = useState<CircleChat[]>([
    {
      id: '1',
      name: 'Tech Enthusiasts',
      lastMessage: 'Great discussion about AI trends today!',
      lastMessageTime: '10:30 AM',
      unreadCount: 3,
      messages: [
        {
          id: '1',
          userId: '1',
          userName: 'Ahmed Ali',
          content: 'Hello everyone! How are you doing?',
          timestamp: '09:15 AM',
          isCurrentUser: false,
        },
        {
          id: '2',
          userId: '2',
          userName: 'You',
          content: 'Hi Ahmed! I\'m doing great, thanks for asking.',
          timestamp: '09:18 AM',
          isCurrentUser: true,
        },
        {
          id: '3',
          userId: '3',
          userName: 'Sara Mohamed',
          content: 'Great discussion about AI trends today!',
          timestamp: '10:30 AM',
          isCurrentUser: false,
        },
      ],
    },
    {
      id: '2',
      name: 'Book Club',
      lastMessage: 'Next book selection voting starts tomorrow',
      lastMessageTime: 'Yesterday',
      unreadCount: 0,
      messages: [
        {
          id: '1',
          userId: '1',
          userName: 'Fatima Hassan',
          content: 'What did everyone think about the last chapter?',
          timestamp: 'Yesterday 8:20 PM',
          isCurrentUser: false,
        },
        {
          id: '2',
          userId: '2',
          userName: 'Omar Ahmed',
          content: 'Next book selection voting starts tomorrow',
          timestamp: 'Yesterday 9:45 PM',
          isCurrentUser: false,
        },
      ],
    },
    {
      id: '3',
      name: 'Photography Club',
      lastMessage: 'Beautiful sunset shots from yesterday\'s walk!',
      lastMessageTime: '2 days ago',
      unreadCount: 1,
      messages: [
        {
          id: '1',
          userId: '1',
          userName: 'Layla Mahmoud',
          content: 'Beautiful sunset shots from yesterday\'s walk!',
          timestamp: '2 days ago',
          isCurrentUser: false,
        },
      ],
    },
  ]);

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedChat) {
      const message: Message = {
        id: Date.now().toString(),
        userId: 'current',
        userName: 'You',
        content: newMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCurrentUser: true,
      };

      setCircles(circles.map(circle =>
        circle.id === selectedChat.id
          ? {
              ...circle,
              messages: [...circle.messages, message],
              lastMessage: newMessage,
              lastMessageTime: 'Just now',
            }
          : circle
      ));

      setSelectedChat({
        ...selectedChat,
        messages: [...selectedChat.messages, message],
        lastMessage: newMessage,
        lastMessageTime: 'Just now',
      });

      setNewMessage('');
    }
  };

  const openChat = (circle: CircleChat) => {
    setSelectedChat(circle);
    // Mark as read
    setCircles(circles.map(c =>
      c.id === circle.id ? { ...c, unreadCount: 0 } : c
    ));
  };

  const closeChat = () => {
    setSelectedChat(null);
  };

  if (selectedChat) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        {/* Chat Header */}
        <View style={[styles.chatHeader, { backgroundColor: surfaceColor }]}>
          <TouchableOpacity style={styles.backButton} onPress={closeChat}>
            <IconSymbol 
              name={isRTL ? "chevron.right" : "chevron.left"} 
              size={24} 
              color={textColor} 
            />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold" style={styles.chatTitle}>
            {selectedChat.name}
          </ThemedText>
        </View>

        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Messages */}
          <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
            {selectedChat.messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
                  isRTL && styles.messageContainerRTL,
                ]}
              >
                {!message.isCurrentUser && (
                  <ThemedText style={styles.messageSender}>{message.userName}</ThemedText>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    {
                      backgroundColor: message.isCurrentUser ? tintColor : surfaceColor,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.messageText,
                      { color: message.isCurrentUser ? '#fff' : textColor },
                      isRTL && styles.messageTextRTL,
                    ]}
                  >
                    {message.content}
                  </ThemedText>
                </View>
                <ThemedText style={styles.messageTime}>{message.timestamp}</ThemedText>
              </View>
            ))}
          </ScrollView>

          {/* Message Input */}
          <View style={[styles.inputContainer, { backgroundColor: surfaceColor }]}>
            <TextInput
              style={[
                styles.messageInput,
                { backgroundColor, color: textColor, textAlign: isRTL ? 'right' : 'left' }
              ]}
              placeholder={texts.typeMessage || 'Type a message...'}
              placeholderTextColor={textColor + '80'}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: tintColor }]}
              onPress={handleSendMessage}
            >
              <IconSymbol 
                name={isRTL ? "arrow.left" : "arrow.right"} 
                size={20} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor }]}>
        <ThemedText type="title" style={[styles.headerTitle, isRTL && styles.rtlText]}>
          {texts.messages || 'Messages'}
        </ThemedText>
      </View>

      {/* Circle Chats List */}
      <ScrollView style={styles.chatsList} showsVerticalScrollIndicator={false}>
        {circles.map((circle) => (
          <TouchableOpacity
            key={circle.id}
            style={[styles.chatItem, { backgroundColor: surfaceColor }]}
            onPress={() => openChat(circle)}
          >
            <View style={[styles.chatItemContent, isRTL && styles.chatItemContentRTL]}>
              <View style={styles.chatInfo}>
                <ThemedText type="defaultSemiBold" style={[styles.chatName, isRTL && styles.rtlText]}>
                  {circle.name}
                </ThemedText>
                <ThemedText
                  style={[styles.lastMessage, isRTL && styles.rtlText]}
                  numberOfLines={1}
                >
                  {circle.lastMessage}
                </ThemedText>
              </View>
              <View style={[styles.chatMeta, isRTL && styles.chatMetaRTL]}>
                <ThemedText style={styles.messageTime}>{circle.lastMessageTime}</ThemedText>
                {circle.unreadCount > 0 && (
                  <View style={[styles.unreadBadge, { backgroundColor: tintColor }]}>
                    <ThemedText style={styles.unreadCount}>{circle.unreadCount}</ThemedText>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
  },
  chatsList: {
    flex: 1,
    padding: 16,
  },
  chatItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  chatItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatItemContentRTL: {
    flexDirection: 'row-reverse',
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    opacity: 0.7,
  },
  chatMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  chatMetaRTL: {
    alignItems: 'flex-start',
  },
  messageTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 2,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  chatTitle: {
    fontSize: 18,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  messageContainerRTL: {
    alignItems: 'flex-end',
  },
  currentUserMessage: {
    alignItems: 'flex-end',
  },
  otherUserMessage: {
    alignItems: 'flex-start',
  },
  messageSender: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
    marginHorizontal: 8,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTextRTL: {
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    gap: 8,
  },
  messageInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rtlText: {
    textAlign: 'right',
  },
});
