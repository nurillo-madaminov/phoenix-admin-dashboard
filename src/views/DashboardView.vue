<script setup>
import { watch, onMounted, onBeforeUnmount, ref } from "vue";
import SideBar from "@/components/SideBar.vue";
import UserChat from "@/components/UserChat.vue";
import { supabase } from "../lib/supabase";

import uploadFile from "../composables/uploadFile";
import { useChatStore } from "@/store/chat";
const chatStore = useChatStore();
const isDragging = ref(false);
const isUploading = ref(false);
const dragUploadStatus = ref("idle");
const draggedFileName = ref("");
let dragSuccessTimer = null;

function resetDragUploadState() {
  dragCounter = 0;
  isDragging.value = false;
  isUploading.value = false;
  dragUploadStatus.value = "idle";
  draggedFileName.value = "";
}

onMounted(async () => {
  await  chatStore.fetchUsers();
  await chatStore.fetchMessages();
  await chatStore.fetchCompanies();
  // chatStore.initVisibilityListener();

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
    dragUploadStatus.value = "loading";

    const file = e.dataTransfer.files[0];
    draggedFileName.value = file?.name || "";
    const targetUserId = chatStore.selectedUser?.telegramId;

    if (!file || !targetUserId || !file.type.includes("pdf")) {
      resetDragUploadState();
      setTimeout(() => {
        alert("Please Upload PDF");
      }, 10);
    } else {
      const url = await uploadFile(file);

      if (!url) {
        resetDragUploadState();
        setTimeout(() => {
          alert("Please Upload PDF");
        }, 10);
        return;
      }

      const message = {
        user_id: targetUserId,
        sender: "admin",
        type: "file",

        text: file.name, // display name
        file_url: url, // actual file link
        file_type: file.type, // 🔥 useful for UI (image/pdf/etc)
      };
      // optimistic UI
      await supabase.from("messages").insert(message);

      dragUploadStatus.value = "success";
      dragSuccessTimer = setTimeout(resetDragUploadState, 1200);
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
      resetDragUploadState();
    }
  },
);

onBeforeUnmount(() => {
  if (dragSuccessTimer) {
    clearTimeout(dragSuccessTimer);
  }
  removeDragListeners();
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
      class="absolute top-0 left-0 z-50 w-full h-screen flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-black/70"
    >
      <div
        class="w-full max-w-sm rounded border border-gray-200 bg-white p-6 text-gray-900 shadow-2xl dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      >
        <div
          v-if="dragUploadStatus === 'success'"
          class="flex flex-col items-center text-center"
        >
          <div
            class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-300"
          >
            <svg
              class="h-7 w-7"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
            File sent
          </h2>
          <p class="mt-2 max-w-full truncate text-sm text-gray-500 dark:text-gray-300">
            {{ draggedFileName }}
          </p>
        </div>

        <div
          v-else-if="isUploading"
          class="flex flex-col items-center text-center"
        >
          <span
            class="loading loading-spinner loading-xl text-blue-600 dark:text-blue-300"
          ></span>
          <h2 class="mt-4 text-xl font-semibold text-gray-800 dark:text-gray-100">
            Sending file
          </h2>
          <p class="mt-2 max-w-full truncate text-sm text-gray-500 dark:text-gray-300">
            {{ draggedFileName }}
          </p>
        </div>

        <div v-else class="flex flex-col items-center text-center">
          <div
            class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
          >
            <svg
              class="h-7 w-7"
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

          <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Drop file to upload
          </h2>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-300">
            Release it to start uploading.
          </p>

          <div
            class="mt-6 w-full rounded border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-900"
          >
            <p class="text-sm text-gray-400 dark:text-gray-300">
              Supported: PDF
            </p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
