
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string | null
          email: string | null
          dob: string | null
          gender: string | null
          language: string | null
          avatar: string | null
          phone: string | null
          address_apartment: string | null
          address_building: string | null
          address_block: string | null
          role: string | null
          creationDate: string | null
        }
        Insert: {
          id: string
          name?: string | null
          email?: string | null
          dob?: string | null
          gender?: string | null
          language?: string | null
          avatar?: string | null
          phone?: string | null
          address_apartment?: string | null
          address_building?: string | null
          address_block?: string | null
          role?: string | null
          creationDate?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          email?: string | null
          dob?: string | null
          gender?: string | null
          language?: string | null
          avatar?: string | null
          phone?: string | null
          address_apartment?: string | null
          address_building?: string | null
          address_block?: string | null
          role?: string | null
          creationDate?: string | null
        }
      }
      interests: {
        Row: {
          id: string
          title: string | null
          category: string | null
          creationDate: string | null
        }
        Insert: {
          id: string
          title?: string | null
          category?: string | null
          creationDate?: string | null
        }
        Update: {
          id?: string
          title?: string | null
          category?: string | null
          creationDate?: string | null
        }
      }
      circles: {
        Row: {
          id: string
          name: string | null
          description: string | null
          privacy: string | null
          creationDate: string | null
        }
        Insert: {
          id: string
          name?: string | null
          description?: string | null
          privacy?: string | null
          creationDate?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          description?: string | null
          privacy?: string | null
          creationDate?: string | null
        }
      }
      events: {
        Row: {
          id: string
          title: string | null
          date: string | null
          time: string | null
          location: string | null
          circleId: string | null
          visibility: string | null
          description: string | null
          createdBy: string | null
          creationDate: string | null
        }
        Insert: {
          id: string
          title?: string | null
          date?: string | null
          time?: string | null
          location?: string | null
          circleId?: string | null
          visibility?: string | null
          description?: string | null
          createdBy?: string | null
          creationDate?: string | null
        }
        Update: {
          id?: string
          title?: string | null
          date?: string | null
          time?: string | null
          location?: string | null
          circleId?: string | null
          visibility?: string | null
          description?: string | null
          createdBy?: string | null
          creationDate?: string | null
        }
      }
      posts: {
        Row: {
          id: string
          userId: string | null
          content: string | null
          image: string | null
          circleId: string | null
          createdAt: string | null
          creationDate: string | null
        }
        Insert: {
          id: string
          userId?: string | null
          content?: string | null
          image?: string | null
          circleId?: string | null
          createdAt?: string | null
          creationDate?: string | null
        }
        Update: {
          id?: string
          userId?: string | null
          content?: string | null
          image?: string | null
          circleId?: string | null
          createdAt?: string | null
          creationDate?: string | null
        }
      }
      comments: {
        Row: {
          id: string
          postId: string | null
          userId: string | null
          text: string | null
          timestamp: string | null
          creationDate: string | null
        }
        Insert: {
          id: string
          postId?: string | null
          userId?: string | null
          text?: string | null
          timestamp?: string | null
          creationDate?: string | null
        }
        Update: {
          id?: string
          postId?: string | null
          userId?: string | null
          text?: string | null
          timestamp?: string | null
          creationDate?: string | null
        }
      }
      circle_messages: {
        Row: {
          id: string
          circleId: string | null
          senderId: string | null
          content: string | null
          type: string | null
          attachment: string | null
          timestamp: string | null
          creationDate: string | null
        }
        Insert: {
          id: string
          circleId?: string | null
          senderId?: string | null
          content?: string | null
          type?: string | null
          attachment?: string | null
          timestamp?: string | null
          creationDate?: string | null
        }
        Update: {
          id?: string
          circleId?: string | null
          senderId?: string | null
          content?: string | null
          type?: string | null
          attachment?: string | null
          timestamp?: string | null
          creationDate?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          userId: string | null
          type: string | null
          content: string | null
          read: boolean | null
          timestamp: string | null
          linkedItemId: string | null
          linkedItemType: string | null
          creationDate: string | null
        }
        Insert: {
          id: string
          userId?: string | null
          type?: string | null
          content?: string | null
          read?: boolean | null
          timestamp?: string | null
          linkedItemId?: string | null
          linkedItemType?: string | null
          creationDate?: string | null
        }
        Update: {
          id?: string
          userId?: string | null
          type?: string | null
          content?: string | null
          read?: boolean | null
          timestamp?: string | null
          linkedItemId?: string | null
          linkedItemType?: string | null
          creationDate?: string | null
        }
      }
      reports: {
        Row: {
          id: string
          userId: string | null
          type: string | null
          targetId: string | null
          message: string | null
          status: string | null
          adminResponse: string | null
          timestamp: string | null
          creationDate: string | null
        }
        Insert: {
          id: string
          userId?: string | null
          type?: string | null
          targetId?: string | null
          message?: string | null
          status?: string | null
          adminResponse?: string | null
          timestamp?: string | null
          creationDate?: string | null
        }
        Update: {
          id?: string
          userId?: string | null
          type?: string | null
          targetId?: string | null
          message?: string | null
          status?: string | null
          adminResponse?: string | null
          timestamp?: string | null
          creationDate?: string | null
        }
      }
      user_interests: {
        Row: {
          userId: string
          interestId: string
        }
        Insert: {
          userId: string
          interestId: string
        }
        Update: {
          userId?: string
          interestId?: string
        }
      }
      user_circles: {
        Row: {
          userId: string
          circleId: string
        }
        Insert: {
          userId: string
          circleId: string
        }
        Update: {
          userId?: string
          circleId?: string
        }
      }
      circle_interests: {
        Row: {
          circleId: string
          interestId: string
        }
        Insert: {
          circleId: string
          interestId: string
        }
        Update: {
          circleId?: string
          interestId?: string
        }
      }
      circle_admins: {
        Row: {
          circleId: string
          userId: string
        }
        Insert: {
          circleId: string
          userId: string
        }
        Update: {
          circleId?: string
          userId?: string
        }
      }
      event_interests: {
        Row: {
          eventId: string
          interestId: string
        }
        Insert: {
          eventId: string
          interestId: string
        }
        Update: {
          eventId?: string
          interestId?: string
        }
      }
      post_likes: {
        Row: {
          postId: string
          userId: string
        }
        Insert: {
          postId: string
          userId: string
        }
        Update: {
          postId?: string
          userId?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
