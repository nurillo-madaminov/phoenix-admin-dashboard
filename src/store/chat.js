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
      console.log(data);
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
          async (payload) => {
            const msg = payload.new;

            // add message to UI
            this.messages.unshift(msg);

            // if admin already opened that user's chat
            if (
              this.selectedUser &&
              msg.user_id === this.selectedUser.telegramId &&
              msg.sender === "user"
            ) {
              // update local state
              msg.is_read = true;

              // update database
              await supabase
                .from("messages")
                .update({ is_read: true })
                .eq("id", msg.id);
            }
          },
        )
        .subscribe();
      console.log(data);
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

      this.hasUnread(this.selectUser.telegramId);

      // update database
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("user_id", user.telegramId)
        .eq("sender", "user");
    },
  },
});
