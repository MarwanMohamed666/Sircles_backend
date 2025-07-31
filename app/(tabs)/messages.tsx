
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getCircleMessages, getCirclesByUser, sendMessage } from '@/lib/database';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName?: string;
  timestamp: string;
  type: string;
  attachment?: string;
}

interface CircleConversation {
  id: string;
  name: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const { texts, isRTL } = useLanguage();
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const [conversations, setConversations] = useState<CircleConversation[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data: userCircles, error } = await getCirclesByUser(user.id);
      
      if (error) {
        console.error('Error loading conversations:', error);
        // Don't show error to user, just show empty state
        setConversations([]);
        return;
      }

      // Transform circles to conversations
      const circleConversations: CircleConversation[] = userCircles?.map(uc => ({
        id: uc.circleId,
        name: uc.circles?.name || 'Circle',
        lastMessage: 'No messages yet',
        lastMessageTime: '',
        unreadCount: 0
      })) || [];

      setConversations(circleConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (circleId: string) => {
    try {
      const { data, error } = await getCircleMessages(circleId);
      
      if (error) {
        console.error('Error loading messages:', error);
        setMessages([]);
        return;
      }

      const formattedMessages: Message[] = data?.map(msg => ({
        id: msg.id,
        content: msg.content || '',
        senderId: msg.senderid,
        senderName: msg.users?.name || 'Unknown User',
        timestamp: msg.timestamp,
        type: msg.type || 'text',
        attachment: msg.attachment || undefined
      })) || [];

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedCircle || !user?.id) return;

    const originalMessage = newMessage.trim();
    setNewMessage(''); // Optimistically clear input

    try {
      const { error } = await sendMessage({
        circleId: selectedCircle,
        senderId: user.id,
        content: originalMessage,
        type: 'text'
      });

      if (error) {
        console.error('Error sending message:', error);
        // Restore message on error and show user feedback
        setNewMessage(originalMessage);
        
        // Show user-friendly error message
        if (error.message.includes('permission')) {
          alert('You do not have permission to send messages in this circle. You may need to join the circle first.');
        } else {
          alert('Failed to send message. Please try again.');
        }
        return;
      }

      // Reload messages to show the new message
      await loadMessages(selectedCircle);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(originalMessage);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    if (selectedCircle) {
      await loadMessages(selectedCircle);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    loadConversations();
  }, [user]);

  useEffect(() => {
    if (selectedCircle) {
      loadMessages(selectedCircle);
    }
  }, [selectedCircle]);

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderConversationItem = (conversation: CircleConversation) => (
    <TouchableOpacity
      key={conversation.id}
      style={[
        styles.conversationItem,
        { backgroundColor: selectedCircle === conversation.id ? tintColor + '20' : 'transparent' }
      ]}
      onPress={() => setSelectedCircle(conversation.id)}
    >
      <View style={[styles.avatarContainer, { backgroundColor: tintColor }]}>
        <IconSymbol name="person.3.fill" size={24} color="#fff" />
      </View>
      
      <View style={styles.conversationInfo}>
        <View style={[styles.conversationHeader, isRTL && styles.conversationHeaderRTL]}>
          <ThemedText type="defaultSemiBold" style={[styles.conversationName, isRTL && styles.rtlText]}>
            {conversation.name}
          </ThemedText>
          {conversation.lastMessageTime && (
            <ThemedText style={styles.conversationTime}>
              {conversation.lastMessageTime}
            </ThemedText>
          )}
        </View>
        
        <View style={[styles.conversationFooter, isRTL && styles.conversationFooterRTL]}>
          <ThemedText style={[styles.lastMessage, isRTL && styles.rtlText]} numberOfLines={1}>
            {conversation.lastMessage}
          </ThemedText>
          {conversation.unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: tintColor }]}>
              <ThemedText style={styles.unreadCount}>
                {conversation.unreadCount}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMessage = (message: Message) => {
    const isMyMessage = message.senderId === user?.id;
    
    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
          isRTL && (isMyMessage ? styles.myMessageContainerRTL : styles.otherMessageContainerRTL)
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isMyMessage ? tintColor : surfaceColor,
              marginLeft: isMyMessage ? 40 : 0,
              marginRight: isMyMessage ? 0 : 40,
            }
          ]}
        >
          {!isMyMessage && (
            <ThemedText style={[styles.senderName, { color: tintColor }]}>
              {message.senderName}
            </ThemedText>
          )}
          <ThemedText style={[
            styles.messageText,
            { color: isMyMessage ? '#fff' : textColor },
            isRTL && styles.rtlText
          ]}>
            {message.content}
          </ThemedText>
          <ThemedText style={[
            styles.messageTime,
            { color: isMyMessage ? '#fff' : textColor },
            isRTL && styles.rtlText
          ]}>
            {formatMessageTime(message.timestamp)}
          </ThemedText>
        </View>
      </View>
    );
  };

  if (!selectedCircle) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: surfaceColor }]}>
          <ThemedText type="title" style={[styles.headerTitle, isRTL && styles.rtlText]}>
            {texts.messages || 'Messages'}
          </ThemedText>
        </View>

        {/* Conversations List */}
        <ScrollView
          style={styles.conversationsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ThemedText>{texts.loading || 'Loading...'}</ThemedText>
            </View>
          ) : conversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol name="message" size={64} color={textColor + '40'} />
              <ThemedText style={styles.emptyText}>
                {texts.noConversations || 'No conversations yet'}
              </ThemedText>
              <ThemedText style={styles.emptySubText}>
                {texts.joinCircleToChat || 'Join a circle to start chatting'}
              </ThemedText>
            </View>
          ) : (
            conversations.map(renderConversationItem)
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const selectedConversation = conversations.find(c => c.id === selectedCircle);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Chat Header */}
      <View style={[styles.chatHeader, { backgroundColor: surfaceColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedCircle(null)}
        >
          <IconSymbol name={isRTL ? "chevron.right" : "chevron.left"} size={24} color={textColor} />
        </TouchableOpacity>
        
        <View style={styles.chatHeaderInfo}>
          <ThemedText type="defaultSemiBold" style={[styles.chatTitle, isRTL && styles.rtlText]}>
            {selectedConversation?.name || 'Circle Chat'}
          </ThemedText>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {messages.length === 0 ? (
            <View style={styles.emptyMessagesContainer}>
              <IconSymbol name="message" size={64} color={textColor + '40'} />
              <ThemedText style={styles.emptyText}>
                {texts.noMessages || 'No messages yet'}
              </ThemedText>
              <ThemedText style={styles.emptySubText}>
                {texts.startConversation || 'Start the conversation!'}
              </ThemedText>
            </View>
          ) : (
            messages.map(renderMessage)
          )}
        </ScrollView>

        {/* Message Input */}
        <View style={[styles.messageInputContainer, { backgroundColor: surfaceColor }]}>
          <TextInput
            style={[
              styles.messageInput,
              { 
                backgroundColor,
                color: textColor,
                textAlign: isRTL ? 'right' : 'left'
              }
            ]}
            placeholder={texts.typeMessage || 'Type a message...'}
            placeholderTextColor={textColor + '60'}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { 
                backgroundColor: newMessage.trim() ? tintColor : textColor + '40'
              }
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <IconSymbol name={isRTL ? "paperplane.fill" : "paperplane.fill"} size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  conversationsList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  conversationName: {
    fontSize: 16,
  },
  conversationTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationFooterRTL: {
    flexDirection: 'row-reverse',
  },
  lastMessage: {
    fontSize: 14,
    opacity: 0.7,
    flex: 1,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  chatHeaderInfo: {
    flex: 1,
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
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  myMessageContainerRTL: {
    alignItems: 'flex-start',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  otherMessageContainerRTL: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 4,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
  },
  messageInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  emptyMessagesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.6,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
  },
  rtlText: {
    textAlign: 'right',
  },
});
