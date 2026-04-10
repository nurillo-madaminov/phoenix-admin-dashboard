<script setup>
import { computed, ref, watch } from "vue";
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

const highlightedSearchIndex = ref(0);
const showAnnouncementModal = ref(false);
const sendingAnnouncement = ref(false);
const announcementText = ref("");
const announcementTarget = ref("all");
const announcementCompanyUSDOT = ref("");
const announcementSuccess = ref("");

const searchResults = computed(() => chatStore.searchUser || []);
const announcementUsers = computed(() => {
  const users = chatStore.users.filter((user) => user.telegramId);

  if (announcementTarget.value !== "company") {
    return users;
  }

  return users.filter(
    (user) =>
      String(user.companyUSDOT) === String(announcementCompanyUSDOT.value),
  );
});

function selectSearchUser(user) {
  if (!user) return;

  chatStore.selectUser(user);
  chatStore.searchFor = "";
  highlightedSearchIndex.value = 0;
}

function moveSearchHighlight(direction) {
  if (!searchResults.value.length) return;

  highlightedSearchIndex.value =
    (highlightedSearchIndex.value + direction + searchResults.value.length) %
    searchResults.value.length;
}

function selectHighlightedUser() {
  selectSearchUser(searchResults.value[highlightedSearchIndex.value]);
}

function openAnnouncementModal() {
  announcementSuccess.value = "";
  announcementTarget.value = chatStore.selectedCompany ? "company" : "all";
  announcementCompanyUSDOT.value = chatStore.selectedCompany ?? "";
  showAnnouncementModal.value = true;
}

function closeAnnouncementModal() {
  if (sendingAnnouncement.value) return;

  showAnnouncementModal.value = false;
}

async function sendAnnouncement() {
  if (sendingAnnouncement.value) return;

  const text = announcementText.value.trim();

  if (!text) {
    alert("Fill announcement message");
    return;
  }

  if (
    announcementTarget.value === "company" &&
    !announcementCompanyUSDOT.value
  ) {
    alert("Select company");
    return;
  }

  if (!announcementUsers.value.length) {
    alert("No users found for this announcement");
    return;
  }

  sendingAnnouncement.value = true;

  const messages = announcementUsers.value.map((user) => ({
    user_id: user.telegramId,
    sender: "admin",
    type: null,
    text,
  }));

  const { error } = await supabase.from("messages").insert(messages);

  sendingAnnouncement.value = false;

  if (error) {
    console.error(error);
    alert("Announcement could not be sent. Please try again.");
    return;
  }

  announcementSuccess.value = `Sent to ${messages.length} user${
    messages.length === 1 ? "" : "s"
  }`;
  announcementText.value = "";
}

watch(
  () => chatStore.searchFor,
  () => {
    highlightedSearchIndex.value = 0;
  },
);
</script>

<template>
  <div class="p-4">
    <div class="border-b border-neutral-200 pb-2">
      <h1 class="text-2xl font-semibold mb-2">Phoenix ELD Serice</h1>
      <div class="relative">
        <div class="flex items-center justify-between w-full gap-2">
          <label class="input p-1 h-8">
            <svg
              class="h-[1em] opacity-50"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <g
                stroke-linejoin="round"
                stroke-linecap="round"
                stroke-width="2.5"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </g>
            </svg>
            <input
              v-model="chatStore.searchFor"
              @keydown.down.prevent="moveSearchHighlight(1)"
              @keydown.up.prevent="moveSearchHighlight(-1)"
              @keydown.enter.prevent="selectHighlightedUser"
              @keydown.esc="chatStore.searchFor = ''"
              type="search"
              required
              placeholder="Search"
            />
          </label>
          <div @click="openAnnouncementModal" class="p-1.5 rounded-lg border text-neutral-500">
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 20 20"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M10 6H5a2 2 0 00-2 2v3a2 2 0 002 2h5l7 4V2l-7 4z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19 8a3 3 0 010 3"
              />
            </svg>
          </div>

          <ul
            v-if="searchResults.length"
            class="list bg-base-100 rounded-box shadow-md absolute z-10 w-full"
          >
            <li
              class="list-row cursor-pointer"
              :class="{
                'bg-blue-100 text-blue-700': index === highlightedSearchIndex,
              }"
              v-for="(user, index) in searchResults"
              :key="user.telegramId"
              @mouseenter="highlightedSearchIndex = index"
              @mousedown.prevent="selectSearchUser(user)"
            >
              {{ user.fullName }}
            </li>
          </ul>
        </div>
      </div>
      <div class="mt-3 flex gap-2 text-neutral-400">
        <span class="text-sm whitespace-nowrap">Company:</span>
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
  <Teleport to="body">
    <div
      v-if="showAnnouncementModal"
      class="absolute top-0 left-0 bg-[#00000083] w-full h-screen z-9999 flex justify-center items-center"
      @click.self="closeAnnouncementModal"
    >
      <div
        class="bg-white w-full max-w-lg p-5 rounded text-gray-900 shadow-2xl dark:bg-gray-800 dark:text-gray-100"
      >
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-xl font-semibold">Announcement</h2>
          <button
            type="button"
            class="btn btn-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            :disabled="sendingAnnouncement"
            @click="closeAnnouncementModal"
          >
            Close
          </button>
        </div>

        <div
          v-if="announcementSuccess"
          class="mt-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
        >
          {{ announcementSuccess }}
        </div>

        <div class="mt-4">
          <label
            class="block text-sm font-medium text-gray-600 dark:text-gray-300"
          >
            Send to
          </label>
          <select
            v-model="announcementTarget"
            class="select select-bordered mt-1 w-full bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-600"
          >
            <option value="all">All users</option>
            <option value="company">One company</option>
          </select>
        </div>

        <div v-if="announcementTarget === 'company'" class="mt-4">
          <label
            class="block text-sm font-medium text-gray-600 dark:text-gray-300"
          >
            Company
          </label>
          <select
            v-model="announcementCompanyUSDOT"
            class="select select-bordered mt-1 w-full bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-600"
          >
            <option value="">Select company</option>
            <option
              v-for="company in chatStore.companies"
              :key="company.USDOT"
              :value="company.USDOT"
            >
              {{ company.name }} {{ company.USDOT }}
            </option>
          </select>
        </div>

        <div class="mt-4">
          <label
            class="block text-sm font-medium text-gray-600 dark:text-gray-300"
          >
            Message
          </label>
          <textarea
            v-model="announcementText"
            class="textarea textarea-bordered mt-1 min-h-32 w-full bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-600"
            placeholder="Type announcement..."
          ></textarea>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <span class="text-sm text-gray-500 dark:text-gray-300">
            {{ announcementUsers.length }} user{{
              announcementUsers.length === 1 ? "" : "s"
            }}
            will receive this
          </span>
          <button
            type="button"
            class="btn btn-active btn-info text-white"
            :disabled="sendingAnnouncement || !announcementUsers.length"
            @click="sendAnnouncement"
          >
            <span
              v-if="sendingAnnouncement"
              class="loading loading-spinner loading-sm"
            ></span>
            <span v-else>Send</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
