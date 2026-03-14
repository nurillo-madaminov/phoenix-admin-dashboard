<script setup>
import { ref } from "vue";
import { useChatStore } from "../store/chat";
import { supabase } from "../lib/supabase";
const chatStore = useChatStore();

const message = ref("");
const showModal = ref(false);

async function sendMessage() {
  if (message.value.length) {
    const newMessage = {
      user_id: chatStore.selectedUser.telegramId,
      sender: "admin",
      type: null,
      text: message.value,
    };

    await supabase.from("messages").insert(newMessage);

    message.value = "";
  } else {
    return;
  }
}

const request = ref("");
const location = ref("");
const date = ref("");
const startTime = ref("");
const endTime = ref("");

const templateMessage = ref(`
#update

📍 ${request.value} updated location:
${location.value}

📅 Date: ${date.value}
🕙 Time: From ${startTime.value} to ${endTime.value}
You were at this location during the time listed above.

✅ BOL – No changes needed
`);

async function sendTemplate() {
  const newMessage = {
    user_id: chatStore.selectedUser.telegramId,
    sender: "admin",
    type: null,
    text: templateMessage._value,
  };
  await supabase.from("messages").insert(newMessage);

  this.showModal = false;
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="showModal"
      class="absolute top-0 left-0 bg-[#00000083] w-full h-screen z-9999 flex justify-center items-center"
      @click.self="showModal = false"
    >
      <div class="p-10 w-md bg-blue-500">
        <select v-model="request" id="">
          <option value="CYCLE">Cycle</option>
          <option value="SHIFT">Shift</option>
          <option value="BREAK">Break</option>
        </select>
        <div>
          <label for="">Location:</label>
          <input type="text" v-model="location" class="border" />
        </div>
        <div>
          <label for="">Start time:</label>
          <input type="text" v-model="startTime" class="border" />
        </div>
        <div>
          <label for="">End time:</label>
          <input type="text" v-model="endTime" class="border" />
        </div>

        <button @click="sendTemplate()" class="border">Send</button>
      </div>
    </div>
  </Teleport>
  <div class="flex-1 w-full flex flex-col bg-gray-50">
    <div
      class="h-[86vh] overflow-y-auto px-5 shadow-[inset_0_-6px_10px_rgba(0,0,0,0.1)] flex flex-col-reverse py-6"
    >
      <div
        class="chat"
        v-for="message in chatStore.filteredMessages"
        :class="message.sender == 'user' ? 'chat-start' : 'chat-end'"
      >
        <div class="chat-bubble max-w-2/3">
          {{ message.text }}
        </div>
      </div>
    </div>

    <div class="max-w-2xl w-full mx-auto">
      <form>
        <label for="chat" class="sr-only">Your message</label>
        <div
          class="flex items-center rounded-lg py-2 px-3 bg-gray-50 dark:bg-gray-700"
        >
          <button
            type="button"
            class="inline-flex justify-center p-2 text-gray-500 rounded-lg cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
          >
            <svg
              class="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>

          <button
            @click="showModal = true"
            type="button"
            class="p-2 text-gray-500 rounded-lg cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
          >
            <svg
              class="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>
          <textarea
            id="chat"
            rows="1"
            class="block mx-4 p-2.5 w-full text-sm text-gray-900 bg-white rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Your message..."
            v-model="message"
          ></textarea>
          <button
            type="button"
            @click="sendMessage()"
            class="inline-flex justify-center p-2 text-blue-600 rounded-full cursor-pointer hover:bg-blue-100 dark:text-blue-500 dark:hover:bg-gray-600"
          >
            <svg
              class="w-6 h-6 rotate-90"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"
              ></path>
            </svg>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
