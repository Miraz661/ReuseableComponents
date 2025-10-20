// contexts/UserSocketContext.tsx
'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'

interface Message {
    id: string
    text: string
    timestamp: string
    isReceived: boolean
    me: boolean
}

interface TypingUser {
    userName: string;
    timestamp: number;
}

interface UserSocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    messages: Message[];
    typingUsers: Map<string, TypingUser>;
    sendMessage: (messageData: any) => void;
    joinConversation: (conversationId: string) => void;
    leaveConversation: (conversationId: string) => void;
    typingStart: (conversationId: string, userName: string) => void;
    typingStop: (conversationId: string, userName: string) => void;
    reconnect: () => void;
    joinPersonal: (id: string) => void;
    updateMessages: (msg:Message[]) => void;
}

const SocketContext = createContext<UserSocketContextType | undefined>(undefined)

const SOCKET_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export function SocketProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [connectionError, setConnectionError] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map())

    const connectSocket = () => {
        const token = localStorage.getItem("token");

        if (!token) {
            console.error("No authentication token found in localStorage")
            setConnectionError("Authentication token not found")
            return null
        }

        console.log("🔌 User connecting to socket server:", SOCKET_URL)

        setIsConnecting(true)
        setConnectionError(null)

        try {
            const newSocket: Socket = io(SOCKET_URL, {
                auth: {
                    token: token
                },
                transports: ["websocket", "polling"],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 10,
                timeout: 20000,
            })

            // Connection events
            newSocket.on("connect", () => {
                console.log("✅ User socket connected successfully. ID:", newSocket.id)
                setIsConnected(true)
                setIsConnecting(false)
                setConnectionError(null)
            })

            newSocket.on("disconnect", (reason) => {
                console.log("❌ User socket disconnected. Reason:", reason)
                setIsConnected(false)
                setIsConnecting(false)
            })

            newSocket.on("connect_error", (error) => {
                console.error("❌ User socket connection error:", error.message)
                setIsConnecting(false)
                setConnectionError(`Connection failed: ${error.message}`)

                setTimeout(() => {
                    if (!isConnected && !isConnecting) {
                        console.log("🔄 User attempting to reconnect...")
                        connectSocket()
                    }
                }, 3000)
            })

            newSocket.on("reconnect", (attemptNumber) => {
                console.log(`🔁 User reconnected after ${attemptNumber} attempts`)
                setIsConnected(true)
                setConnectionError(null)
            })

            newSocket.on("join-conversation", (payload) => {
                console.log("[v0] Successfully joined room:", payload)
            })

            // Message events
            newSocket.on("new-message", (data: any) => {
                console.log("New message : ", data);
                setMessages(prev => [...prev,{
                    id: data.id,
                    me: false,
                    isReceived: false,
                    text: data?.content,
                    timestamp: new Date().toString()
                }])
            })

            // Typing events
            newSocket.on("userTyping", (data: any) => {
                console.log("⌨️ User typing:", data)
                const { conversation_id, user_name } = data
                setTypingUsers(prev => {
                    const newMap = new Map(prev)
                    newMap.set(conversation_id, {
                        userName: user_name,
                        timestamp: Date.now()
                    })
                    return newMap
                })
            })

            newSocket.on("userStoppedTyping", (data: any) => {
                console.log("💤 User stopped typing:", data)
                const { conversation_id } = data
                setTypingUsers(prev => {
                    const newMap = new Map(prev)
                    newMap.delete(conversation_id)
                    return newMap
                })
            })

            // Join room confirmation
            newSocket.on("joinedRoom", (data) => {
                console.log("🚪 User joined room:", data)
            })

            return newSocket
        } catch (error) {
            console.error("❌ Error creating user socket connection:", error)
            setIsConnecting(false)
            setConnectionError("Failed to create connection")
            return null
        }
    }

    useEffect(() => {
        const newSocket = connectSocket()
        setSocket(newSocket)

        return () => {
            if (newSocket) {
                console.log("🧹 Cleaning up user socket connection")
                newSocket.disconnect()
            }
        }
    }, [])

    const sendMessage = (messageData: any) => {
        if (socket && isConnected) {
            console.log("📤 User sending message:", messageData)
            socket.emit("send-message", messageData)
        } else {
            console.error("❌ Cannot send message - socket not connected")
        }
    }

    const joinConversation = (conversationId: string) => {
        if (socket && isConnected) {
            console.log("🚪 User joining conversation:", conversationId)
            socket.emit("join-conversation", conversationId)
        }
    }
    const joinPersonal = (userId: string) => {
        if (socket && isConnected) {
            console.log("🚪 User joining personal room:", userId)
            socket.emit("join", userId)
        }
    }

    const leaveConversation = (conversationId: string) => {
        if (socket && isConnected) {
            console.log("🚪 User leaving conversation:", conversationId)
            socket.emit("leaveRoom", { room_id: conversationId })
        }
    }

    const typingStart = (conversationId: string, userName: string) => {
        if (socket && isConnected) {
            socket.emit("typingStart", {
                conversation_id: conversationId,
                user_name: userName
            })
        }
    }

    const typingStop = (conversationId: string, userName: string) => {
        if (socket && isConnected) {
            socket.emit("typingStop", {
                conversation_id: conversationId,
                user_name: userName
            })
        }
    }

    const updateMessages=(newMessage:Message[])=>{
        setMessages(prev => [...prev,...newMessage])
    }

    const reconnect = () => {
        if (socket) {
            socket.disconnect()
        }
        const newSocket = connectSocket()
        setSocket(newSocket)
    }

    return (
        <SocketContext.Provider value={{
            socket,
            isConnected,
            messages,
            typingUsers,
            sendMessage,
            joinConversation,
            leaveConversation,
            typingStart,
            typingStop,
            reconnect,
            joinPersonal,
            updateMessages
        }}>
            {children}
        </SocketContext.Provider>
    )
}

export function useSocket() {
    const context = useContext(SocketContext)
    if (context === undefined) {
        throw new Error('useSocket must be used within a SocketProvider')
    }
    return context
}
