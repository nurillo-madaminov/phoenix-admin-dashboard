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
    <div>
      <h1 class="text-xl font-semibold">Drivers</h1>
      <div class="flex gap-2 text-neutral-400">
        Company:
        <select v-model="chatStore.selectedCompany">
          <option :value="null">All</option>
          <option :value="company.USDOT" v-for="company in chatStore.companies">
            {{ company.name }}
          </option>
        </select>
      </div>
    </div>
    <div v-if="chatStore.users.length <= 0">
      <h1 class="py-10 text-center">No users yet</h1>
    </div>
    <ul v-else class="menu">
      <!-- Sidebar content here -->
      <li
        v-for="user in chatStore.sortedUsers"
        :key="user.telegramId"
        @click="chatStore.selectUser(user)"
        class="w-50"
      >
        <a class="relative flex items-center justify-between uppercase w-full">
          <span>{{ user.fullName }}</span>

          <span
            v-if="chatStore.hasUnread(user.telegramId)"
            class="w-3 h-3 rounded-full bg-blue-400 border"
          ></span>
        </a>
      </li>
    </ul>
    <button class="btn btn-wide" @click="logout">Log out</button>
  </div>
</template>
