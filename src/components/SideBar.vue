<script setup>
import { useChatStore } from "../store/chat";
import { supabase } from "@/lib/supabase";
import { useRouter } from "vue-router";

const chatStore = useChatStore();

const router = useRouter();

const logout = async () => {
  await supabase.auth.signOut();
  console.log("logout");
  router.push("/");
};
</script>

<template>
  <div class="p-4">
    <h1 class="text-xl font-semibold">Drivers</h1>
    <div v-if="chatStore.users.length <= 0" class="w-[30vw]">
      <h1 class="py-10 text-center">No users yet</h1>
    </div>
    <ul v-else class="menu w-[30vw]">
      <!-- Sidebar content here -->
      <li
        v-for="user in chatStore.users"
        :key="user.telegramId"
        @click="chatStore.selectUser(user)"
      >
        <a>{{ user.fullName }}</a>
      </li>
    </ul>
    <button class="btn btn-wide" @click="logout">Log out</button>
  </div>
</template>
