<script setup>
import { watch, onMounted, ref } from "vue";
import SideBar from "@/components/SideBar.vue";
import UserChat from "@/components/UserChat.vue";
import { supabase } from "../lib/supabase";

import uploadFile from "../composables/uploadFile";
import { useChatStore } from "@/store/chat";
const chatStore = useChatStore();
const isDragging = ref(false);
const isUploading = ref(false);

onMounted(() => {
  chatStore.fetchUsers();
  chatStore.fetchMessages();
  chatStore.fetchCompanies();

  window.addEventListener("keydown", (e) => {
    if (e.key == "Escape") {
      chatStore.selectedUser = null;
    }
  });
});

let handlers = {};
let dragCounter = 0;

function addDragListeners() {
  handlers.dragenter = () => {
    dragCounter++;
    isDragging.value = true;
  };

  handlers.dragover = (e) => {
    e.preventDefault();
    isDragging.value = true;
  };

  handlers.drop = async (e) => {
    e.preventDefault();
    if (isUploading.value) return;

    isUploading.value = true;

    const file = e.dataTransfer.files[0];
    const url = await uploadFile(file);

    if (!url || !file.type.includes("pdf")) {
      dragCounter = 0;
      isDragging.value = false;
      isUploading.value = false;
      setTimeout(() => {
        alert("Please Upload PDF");
      }, 10);
    } else {
      const message = {
        user_id: chatStore.selectedUser.telegramId,
        sender: "admin",
        type: "file",

        text: file.name, // display name
        file_url: url, // actual file link
        file_type: file.type, // 🔥 useful for UI (image/pdf/etc)
      };
      // optimistic UI
      await supabase.from("messages").insert(message);

      dragCounter = 0;
      isDragging.value = false;
      isUploading.value = false;
    }
  };

  handlers.dragleave = () => {
    dragCounter--;
    if (dragCounter === 0) {
      isDragging.value = false;
    }
  };

  window.addEventListener("dragenter", handlers.dragenter);
  window.addEventListener("dragover", handlers.dragover);
  window.addEventListener("drop", handlers.drop);
  window.addEventListener("dragleave", handlers.dragleave);
}

function removeDragListeners() {
  window.removeEventListener("dragenter", handlers.dragenter);
  window.removeEventListener("dragover", handlers.dragover);
  window.removeEventListener("drop", handlers.drop);
  window.removeEventListener("dragleave", handlers.dragleave);
}

watch(
  () => chatStore.selectedUser,
  (user) => {
    if (user) {
      addDragListeners();
    } else {
      removeDragListeners();
      isDragging.value = false;
    }
  },
);
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
      <div
        class="flex-1 h-full flex flex-col border-l w-[70vw] bg-gray-50 dark:bg-gray-700"
      >
        <div v-if="chatStore.selectedUser !== null">
          <div class="navbar bg-base-300 shadow-lg z-50 px-4">
            <div class="flex flex-col">
              <p class="text-lg font-semibold uppercase">
                {{ chatStore.selectedUser?.fullName }}
              </p>
              <!-- <span class="text-sm text-neutral-500">
                Company:
                {{ chatStore.selectedUser?.companyUSDOT }}
              </span> -->
              <span class="text-sm text-neutral-500">
                Company:
                {{
                  chatStore.companies.find(
                    (i) => i.USDOT == chatStore.selectedUser?.companyUSDOT,
                  )?.name
                }}
                {{ chatStore.selectedUser?.companyUSDOT }}
              </span>
            </div>
          </div>
          <UserChat />
        </div>
        <div v-else class="h-screen flex items-center justify-center">
          <h1>Select a chat to start messaging</h1>
        </div>
      </div>
    </div>
  </div>
  <Teleport to="body">
    <div
      v-if="isDragging"
      class="absolute top-0 left-0 z-50 w-full h-screen flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div
        v-if="!isUploading"
        class="w-full max-w-xl rounded-2xl border-2 border-dashed border-white/40 bg-white p-8 shadow-2xl"
      >
        <div class="flex flex-col items-center text-center">
          <div
            class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100"
          >
            <svg
              class="h-8 w-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M12 11v8m0-8l-3 3m3-3l3 3"
              />
            </svg>
          </div>

          <h2 class="text-2xl font-semibold text-gray-800">
            Drop file to upload
          </h2>
          <p class="mt-2 text-sm text-gray-500">
            Drag and drop your file here, or release it to start uploading.
          </p>

          <div class="mt-6 w-full rounded-xl bg-gray-50 p-6">
            <p class="text-sm text-gray-400">
              Supported: JPG, PNG, PDF, DOCX, ZIP
            </p>
          </div>
        </div>
      </div>
      <div v-else>
        <span class="loading loading-spinner loading-xl"></span>
      </div>
    </div>
  </Teleport>
</template>
