import { useCallback, useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { getAccessToken } from "../api/http";

/**
 * Hook quản lý kết nối SignalR tới SupportChatHub.
 *
 * @param {object}   opts
 * @param {boolean}  opts.enabled      – bật/tắt kết nối
 * @param {function} opts.onReceiveMessage
 * @param {function} opts.onNewConversation
 * @param {function} opts.onConversationAssigned
 * @param {function} opts.onConversationClosed
 * @param {function} opts.onUserTyping
 * @param {function} opts.onMessagesRead
 * @param {function} opts.onError
 */
export default function useSupportChat({
  enabled = false,
  onReceiveMessage,
  onNewConversation,
  onConversationAssigned,
  onConversationClosed,
  onUserTyping,
  onMessagesRead,
  onError,
} = {}) {
  const [connected, setConnected] = useState(false);
  const connectionRef = useRef(null);
  const callbacksRef = useRef({});

  // Keep callbacks ref up to date to avoid reconnect on change
  useEffect(() => {
    callbacksRef.current = {
      onReceiveMessage,
      onNewConversation,
      onConversationAssigned,
      onConversationClosed,
      onUserTyping,
      onMessagesRead,
      onError,
    };
  });

  useEffect(() => {
    if (!enabled) {
      // Disconnect if disabled
      if (connectionRef.current) {
        connectionRef.current.stop().catch(() => {});
        connectionRef.current = null;
        setConnected(false);
      }
      return;
    }

    const baseUrl = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");
    const hubUrl = `${baseUrl}/hubs/support-chat`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => getAccessToken() || "",
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    // --------- Register handlers ----------
    connection.on("ReceiveMessage", (event) => {
      callbacksRef.current.onReceiveMessage?.(event);
    });

    connection.on("NewConversation", (event) => {
      callbacksRef.current.onNewConversation?.(event);
    });

    connection.on("ConversationAssigned", (event) => {
      callbacksRef.current.onConversationAssigned?.(event);
    });

    connection.on("ConversationClosed", (event) => {
      callbacksRef.current.onConversationClosed?.(event);
    });

    connection.on("UserTyping", (event) => {
      callbacksRef.current.onUserTyping?.(event);
    });

    connection.on("MessagesRead", (event) => {
      callbacksRef.current.onMessagesRead?.(event);
    });

    connection.on("Error", (msg) => {
      callbacksRef.current.onError?.(msg);
    });

    connection.onreconnecting(() => setConnected(false));
    connection.onreconnected(() => setConnected(true));
    connection.onclose(() => setConnected(false));

    // Start connection
    connection
      .start()
      .then(() => setConnected(true))
      .catch((err) => {
        console.error("SupportChatHub connection failed", err);
        setConnected(false);
      });

    return () => {
      connection.stop().catch(() => {});
      connectionRef.current = null;
      setConnected(false);
    };
  }, [enabled]);

  // --------- Exposed methods ----------

  const joinConversation = useCallback(async (conversationId) => {
    const conn = connectionRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected) {
      await conn.invoke("JoinConversation", conversationId);
    }
  }, []);

  const leaveConversation = useCallback(async (conversationId) => {
    const conn = connectionRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected) {
      await conn.invoke("LeaveConversation", conversationId);
    }
  }, []);

  const sendMessage = useCallback(async (conversationId, content) => {
    const conn = connectionRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected) {
      await conn.invoke("SendMessage", conversationId, content);
      return true;
    }
    return false;
  }, []);

  const sendTyping = useCallback(async (conversationId, isTyping) => {
    const conn = connectionRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected) {
      await conn.invoke("Typing", conversationId, isTyping);
    }
  }, []);

  const markAsRead = useCallback(async (conversationId) => {
    const conn = connectionRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected) {
      await conn.invoke("MarkAsRead", conversationId);
    }
  }, []);

  return {
    connected,
    joinConversation,
    leaveConversation,
    sendMessage,
    sendTyping,
    markAsRead,
  };
}
