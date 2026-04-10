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

const searchResults = computed(() => chatStore.searchUser || []);

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
        <label class="input p-1 h-8 mb-2">
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
      <div class="flex gap-2 text-neutral-400">
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
</template>
