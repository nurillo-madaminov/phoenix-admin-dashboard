<script setup>
import { onMounted, ref } from "vue";
import SideBar from "@/components/SideBar.vue";
import UserChat from "@/components/UserChat.vue";

import { useChatStore } from "@/store/chat";
const chatStore = useChatStore();


onMounted(() => {
  chatStore.fetchUsers();
  chatStore.fetchMessages();


  window.addEventListener("keydown", (e) => {
    if (e.key == "Escape") {
      chatStore.selectedUser = null;
    }
  });
});
</script>

<template>
  <div>
    <div
      v-if="chatStore.loading"
      class="h-screen flex justify-center items-center bg-neutral-300"
    >
      <span class="loading loading-spinner loading-xl"></span>
    </div>
    <div v-else class="h-screen flex flex-1">
      <SideBar />
      <div class="flex-1 h-full flex flex-col border-l w-[70vw] relative">
        <div v-if="chatStore.selectedUser !== null">
          <div class="navbar bg-base-300 shadow-lg z-50 px-4">
            <div class="flex flex-col">
              <p class="text-lg font-semibold">
                {{ chatStore.selectedUser?.fullName }}
              </p>
              <span class="text-sm">
                Last active at:
                {{
                  new Date(chatStore.selectedUser?.lastActiveAt)
                    .toTimeString()
                    .slice(0, 5)
                }}
              </span>
            </div>
          </div>
          <UserChat class="flex-1 w-full" />
        </div>
        <div v-else class="h-screen flex items-center justify-center">
          <h1>Select a chat to start messaging</h1>
        </div>
      </div>
    </div>
  </div>
</template>
