import { defineStore } from "pinia";
import { supabase } from "../lib/supabase.js";
import notification from "../assets/sounds/notification.mp3";

const DEBUG = import.meta.env.VITE_DEBUG_REALTIME === "true";

export const useChatStore = defineStore("chat", {
  state: () => ({
    users: [],
    messages: [],
    companies: [],
    selectedCompany: null,
    selectedUser: null,
    loading: false,
    isUploading: false,
    searchFor: "",
    // Channel references for cleanup
    channels: {
      users: null,
      messages: null,
      companies: null,
    },
    reconnecting: {
      users: false,
      messages: false,
      companies: false,
    },
    // lastMessageDate: null, // 👈 no cursor yet
    // hasMore: true, // 👈 assume there are more messages
    // loadingMessages: false,
    // loadingMoreMessages: false,
  }),
  getters: {
    filteredMessages: (state) => {
      return state.messages.filter(
        (message) => message.user_id === state.selectedUser.telegramId,
      );
    },

    sortedUsers(state) {
      return [...this.filteredUsersByUSDOT].sort((a, b) => {
        const lastA = state.messages.find((m) => m.user_id === a.telegramId);
        const lastB = state.messages.find((m) => m.user_id === b.telegramId);

        const timeA = lastA ? new Date(lastA.created_at).getTime() : 0;
        const timeB = lastB ? new Date(lastB.created_at).getTime() : 0;

        return timeB - timeA;
      });
    },

    filteredUsersByUSDOT() {
      if (this.selectedCompany == null) return this.users;
      return this.users.filter(
        (user) => user.companyUSDOT == this.selectedCompany,
      );
    },

    searchUser() {
      const q = this.searchFor.toLowerCase().trim();
      if (!q) return;

      return this.users.filter((user) => {
        return (
          user.fullName?.toLowerCase().includes(q) ||
          user.phone?.includes(q) ||
          user.companyUSDOT?.toString().includes(q)
        );
      });
    },
  },
  actions: {
    // Initialize visibility change listener for reconnection
    // initVisibilityListener() {
    //   if (typeof document === "undefined") return;

    //   document.addEventListener("visibilitychange", () => {
    //     if (document.visibilityState === "visible") {
    //       if (DEBUG) {
    //         console.log(
    //           "[ChatStore] Tab became visible, checking subscriptions...",
    //         );
    //       }
    //       // Reconnect all channels when tab becomes visible
    //       this.reconnectAllChannels();
    //     }
    //   });
    // },

    // Reconnect all channels - useful after tab becomes visible
    reconnectAllChannels() {
      Object.keys(this.channels).forEach((channelName) => {
        const channel = this.channels[channelName];
        if (channel) {
          const state = channel.state;
          if (DEBUG) {
            console.log(`[ChatStore] Channel ${channelName} state: ${state}`);
          }
          if (state !== "joined") {
            if (DEBUG) {
              console.log(`[ChatStore] Reconnecting ${channelName} channel...`);
            }
            channel.subscribe();
          }
        }
      });
    },

    // Cleanup a specific channel before creating a new one
    cleanupChannel(channelName) {
      const existingChannel = this.channels[channelName];
      if (existingChannel) {
        if (DEBUG) {
          console.log(
            `[ChatStore] Cleaning up existing ${channelName} channel`,
          );
        }
        supabase.removeChannel(existingChannel);
        this.channels[channelName] = null;
      }
    },

    async fetchUsers() {
      this.loading = true;
      const { data, error } = await supabase.from("users").select("*");
      if (error) {
        console.error("[ChatStore] Error fetching users:", error);
        return;
      }

      this.users = data;

      // Cleanup existing channel before creating new one
      this.cleanupChannel("users");

      this.subscribeUsersChannel();

      this.loading = false;
    },

    async fetchMessages() {
      this.loading = true;
      const { data, error } = await supabase.rpc(
        "get_last_20_admin_user_messages",
      );
      // const { data, error } = await supabase
      //   .from("messages")
      //   .select("*")
      //   .order("created_at", { ascending: false });

      // console.log(data);
      if (error) {
        console.error("[ChatStore] Error fetching messages:", error);
        return;
      }

      this.messages = data;
      this.loading = false;

      // 👇 remember the oldest message you got
      // this.lastMessageDate = data[data.length - 1]?.created_at;

      // this.hasMore = data.length === LIMIT;

      // Cleanup existing channel before creating new one
      this.cleanupChannel("messages");

      this.subscribeMessagesChannel();
    },

    async fetchCompanies() {
      const { data, error } = await supabase.from("companies").select("*");
      if (error) {
        console.error("[ChatStore] Error fetching companies:", error);
        return;
      }

      this.companies = data;
      // console.log(data);

      // Cleanup existing channel before creating new one
      this.cleanupChannel("companies");

      this.subscribeCompaniesChannel();
    },

    hasUnread(userId) {
      return this.messages.some(
        (m) => m.user_id === userId && m.sender === "user" && !m.is_read,
      );
    },

    async selectUser(user) {
      this.selectedUser = user;

      // update local messages instantly
      this.filteredMessages.forEach((element) => {
        element.is_read = true;
      });

      // update database
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("user_id", user.telegramId)
        .eq("sender", "user")
        .eq("is_read", false);
    },

    subscribeUsersChannel() {
      if (this.channels.users) {
        supabase.removeChannel(this.channels.users);
        this.channels.users = null;
      }

      this.channels.users = supabase
        .channel("users-channel")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "users",
          },
          (payload) => {
            if (DEBUG) {
              console.log("[ChatStore] New user received:", payload.new);
            }
            this.users.unshift(payload.new);
          },
        )
        .subscribe((status) => {
          if (DEBUG) {
            console.log(`[ChatStore] Users channel status: ${status}`);
          }

          if (status === "SUBSCRIBED") {
            this.reconnecting.users = false;
            console.log("USERS channel connected.");
          }

          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            if (this.reconnecting.users) return;
            this.reconnecting.users = true;

            console.log("USERS channel disconnected. Reconnecting...");

            setTimeout(() => {
              this.subscribeUsersChannel();
            }, 1000);
          }
        });
    },

    subscribeMessagesChannel() {
      if (this.channels.messages) {
        supabase.removeChannel(this.channels.messages);
        this.channels.messages = null;
      }

      this.channels.messages = supabase
        .channel("messages-channel")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          async (payload) => {
            const msg = payload.new;

            if (DEBUG) {
              console.log("[ChatStore] New message received:", msg);
            }

            // add message to UI
            this.messages.unshift(msg);
            if (msg.sender == "user") {
              const audio = new Audio(notification);
              audio.play();
            }
          },
        )
        .subscribe((status) => {
          if (DEBUG) {
            console.log(`[ChatStore] Messages channel status: ${status}`);
          }
          if (status === "SUBSCRIBED") {
            this.reconnecting.messages = false;
            console.log("MESSAGES channel connected.");
          }
          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            if (this.reconnecting.messages) return;
            this.reconnecting.messages = true;

            console.log("MESSAGES channel disconnected. Reconnecting...");
            setTimeout(() => {
              this.subscribeMessagesChannel();
            }, 1000);
          }
        });
    },

    subscribeCompaniesChannel() {
      if (this.channels.companies) {
        supabase.removeChannel(this.channels.companies);
        this.channels.companies = null;
      }
      this.channels.companies = supabase
        .channel("companies-channel")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "companies",
          },
          async (payload) => {
            const company = payload.new;
            if (DEBUG) {
              console.log("[ChatStore] New company received:", company);
            }
            this.companies.unshift(company);
          },
        )
        .subscribe((status) => {
          if (DEBUG) {
            console.log(`[ChatStore] Companies channel status: ${status}`);
          }
          if (status === "SUBSCRIBED") {
            this.reconnecting.companies = false;
            console.log("COMPANIES channel connected.");
          }
          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            if (this.reconnecting.companies) return;
            this.reconnecting.companies = true;

            console.log("COMPANIES channel disconnected. Reconnecting...");
            setTimeout(() => {
              this.subscribeCompaniesChannel();
            }, 1000);
          }
        });
    },

    // Cleanup all channels - call this when logging out or unmounting
    cleanupAllChannels() {
      if (DEBUG) {
        console.log("[ChatStore] Cleaning up all channels");
      }
      Object.keys(this.channels).forEach((channelName) => {
        this.cleanupChannel(channelName);
      });
    },
  },
});

// async fetchMoreMessages() {
//   if (!this.hasMore || this.loadingMoreMessages) return;

//   this.loadingMoreMessages = true;
//   const LIMIT = 20;

//   const { data, error } = await supabase
//     .from("messages")
//     .select("*")
//     .eq("user_id", this.selectedUser.telegramId)
//     .lt("created_at", this.lastMessageDate) // 👈 KEY
//     .order("created_at", { ascending: false })
//     .limit(LIMIT);

//   if (error) {
//     console.log(error);
//     this.loadingMoreMessages = false;
//     return;
//   }

//   this.messages.push(...data); // 👈 append older messages

//   // update cursor
//   this.lastMessageDate = data[data.length - 1]?.created_at;

//   if (data.length < LIMIT) {
//     this.hasMore = false;
//   }

//   this.loadingMoreMessages = false;
// },
