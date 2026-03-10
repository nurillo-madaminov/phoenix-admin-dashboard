import { defineStore } from "pinia";
import { supabase } from "../lib/supabase.js";

export const useChatStore = defineStore("chat", {
  state: () => ({
    users: [],
    messages: [],
    selectedUser: null,
    loading: false,
  }),
  getters: {
    filteredMessages: (state) => {
      return state.messages.filter(
        (message) => message.user_id === state.selectedUser.telegramId,
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

      // data.forEach((user) => {
      //   userObj[user.telegramId] = user;
      // });

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
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });
        console.log(data)
      if (error) {
        console.log(error);
        return;
      }

      this.messages = data;

      supabase
        .channel("messages-channel")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            this.messages.unshift(payload.new);
          },
        )
        .subscribe();
      console.log(data);
    },

    selectUser(user) {
      this.selectedUser = user;
      console.log(user);
    },
  },
});
