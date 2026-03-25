import { defineStore } from "pinia";
import { supabase } from "../lib/supabase.js";

export const useChatStore = defineStore("chat", {
  state: () => ({
    users: [],
    messages: [],
    companies: [],
    selectedCompany: null,
    selectedUser: null,
    loading: false,
    isUploading: false,
    lastMessageDate: null, // 👈 no cursor yet
    hasMore: true, // 👈 assume there are more messages
    loadingMessages: false,
    loadingMoreMessages: false,
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
  },
  actions: {
    async fetchUsers() {
      this.loading = true;
      const { data, error } = await supabase.from("users").select("*");
      if (error) {
        console.log(error);
        return;
      }

      this.users = data;

      supabase
        .channel("users-channel")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "users",
          },
          (payload) => {
            this.users.unshift(payload.new);
          },
        )
        .subscribe();

      this.loading = false;
    },

    async fetchMessages() {
      // const LIMIT = 20;
      this.loadingMessages = true;
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });
        // .eq("user_id", this.selectedUser.telegramId)
        // .limit(LIMIT);

      // console.log(data);
      if (error) {
        console.log(error);
        return;
      }

      this.messages = data;
      this.loadingMessages = false;

      // 👇 remember the oldest message you got
      this.lastMessageDate = data[data.length - 1]?.created_at;

      this.hasMore = data.length === LIMIT;

      supabase
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

            // add message to UI
            this.messages.unshift(msg);
          },
        )
        .subscribe();
    },

    async fetchMoreMessages() {
      if (!this.hasMore || this.loadingMoreMessages) return;

      this.loadingMoreMessages = true;
      const LIMIT = 20;

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", this.selectedUser.telegramId)
        .lt("created_at", this.lastMessageDate) // 👈 KEY
        .order("created_at", { ascending: false })
        .limit(LIMIT);

      if (error) {
        console.log(error);
        this.loadingMoreMessages = false;
        return;
      }

      this.messages.push(...data); // 👈 append older messages

      // update cursor
      this.lastMessageDate = data[data.length - 1]?.created_at;

      if (data.length < LIMIT) {
        this.hasMore = false;
      }

      this.loadingMoreMessages = false;
    },

    async fetchCompanies() {
      const { data, error } = await supabase.from("companies").select("*");
      if (error) {
        console.log(error);
        return;
      }

      this.companies = data;
      // console.log(data);

      supabase
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
            this.companies.unshift(company);
          },
        )
        .subscribe();
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

      // this.hasUnread(this.selectUser.telegramId);

      // update database
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("user_id", user.telegramId)
        .eq("sender", "user")
        .eq("is_read", false);

      await this.fetchMessages();
    },
  },
});
