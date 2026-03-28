<script setup>
import { ref } from "vue";
import { useChatStore } from "../store/chat";
import { supabase } from "../lib/supabase";
import uploadFile from "../composables/uploadFile";
const chatStore = useChatStore();

const message = ref("");
const showModal = ref(false);
const sendingMessage = ref(false);

async function sendMessage() {
  if (sendingMessage.value == true) return;

  sendingMessage.value = true;

  if (message.value.length) {
    const newMessage = {
      user_id: chatStore.selectedUser.telegramId,
      sender: "admin",
      type: null,
      text: message.value.trim(),
    };

    // const tempMes = {
    //   user_id: chatStore.selectedUser.telegramId,
    //   sender: "admin",
    //   type: null,
    //   text: message.value.trim(),
    //   created_at: new Date().toISOString(),
    // };

    // chatStore.messages.push(tempMes);

    await supabase.from("messages").insert(newMessage);

    message.value = "";
    sendingMessage.value = false;
  } else {
    return;
  }
}

const sending = ref(false);
const service = ref("SHIFT");
const location = ref("");
const date = ref("");
const startTime = ref("");
const endTime = ref("");
const billOfLeading = ref("");
const customText = ref("");
const isCustomText = ref(false);

async function sendTemplate() {
  sending.value = true;

  if (isCustomText.value) {
    if (!customText.value.trim()) {
      sending.value = false;
      alert("Fill the textarea");
      return;
    }
  } else {
    if (
      !location.value.trim() ||
      !date.value ||
      !startTime.value ||
      !endTime.value
    ) {
      sending.value = false;
      alert("Fill all inputs");
      return;
    }
  }

  const customMessage = `
#update

📍 ${service.value} updated location:
${location.value}

${customText.value}
You were at this location during the time listed above.

${billOfLeading.value}
`;

  const templateMessage = `
#update

📍 ${service.value} updated location:
${location.value}

📅 Date: ${date.value}
🕙 Time: From ${startTime.value} to ${endTime.value}
You were at this location during the time listed above.

${billOfLeading.value}
`;

  const newMessage = {
    user_id: chatStore.selectedUser.telegramId,
    sender: "admin",
    type: null,
    text: isCustomText.value ? customMessage.trim() : templateMessage.trim(),
  };
  await supabase.from("messages").insert(newMessage);

  service.value = "SHIFT";
  location.value = "";
  date.value = "";
  startTime.value = "";
  endTime.value = "";
  billOfLeading.value = "";
  customText.value = "";

  sending.value = false;
  showModal.value = false;
}

function isLastInGroup(index) {
  const current = chatStore.filteredMessages[index];
  const prev = chatStore.filteredMessages[index - 1];

  if (!prev) return true;

  return current.sender !== prev.sender;
}

const isUploading = ref(false);

const handleFile = async (e) => {
  isUploading.value = true;
  const file = e.target.files[0];
  const url = await uploadFile(file);
  if (!url || !file.type.includes("pdf")) {
    isUploading.value = false;
    alert('Plase Upload PDF')
    return;
  }

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
  // console.log(e.target.files[0]);
  isUploading.value = false;
};

function isNewDate(index) {
  const messages = chatStore.filteredMessages;

  if (index === messages.length - 1) return true; // first message (because flex-col-reverse)

  const current = new Date(messages[index].created_at);
  const prev = new Date(messages[index + 1].created_at);

  return current.toDateString() !== prev.toDateString();
}

function formatDate(date) {
  const d = new Date(date);

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const dStr = d.toDateString();
  const todayStr = today.toDateString();
  const yesterdayStr = yesterday.toDateString();

  if (dStr === todayStr) return "Today";
  if (dStr === yesterdayStr) return "Yesterday";

  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
  });
}
</script>

<template>
  <div class="flex-1 w-full flex flex-col">
    <div
      class="h-[86vh] overflow-y-auto px-5 shadow-[inset_0_-6px_10px_rgba(0,0,0,0.1)] flex flex-col-reverse pt-4"
    >
      <div
        class="chat flex flex-col"
        v-for="(message, index) in chatStore.filteredMessages"
        :class="message.sender == 'user' ? 'chat-start' : 'chat-end'"
      >
        <!-- DATE SEPARATOR -->
        <div
          v-if="isNewDate(index)"
          class="flex items-center my-5 gap-3 self-center"
        >
          <div
            class="px-3 py-0.5 text-sm font-medium text-gray-500 bg-white shadow-sm rounded-full border border-gray-200"
          >
            {{ formatDate(message.created_at) }}
          </div>

          <div class="flex-1 h-px bg-gray-300/60"></div>
        </div>

        <!-- MESSAGE -->
        <div
          class="mb-4 chat-bubble max-w-2/3 min-w-28 relative"
          :class="{ 'before:hidden! mb-0!': !isLastInGroup(index) }"
        >
          <p class="mb-1 mr-8 whitespace-pre-line wrap-break-word">
            <a
              v-if="message.type == 'file'"
              class="text-blue-500"
              :href="message.file_url"
              target="_blank"
              >{{ message.text }}</a
            >
            <span v-else>{{ message.text }}</span>
          </p>
          <div class="text-sm absolute bottom-1 right-2 opacity-40">
            {{
              String(new Date(message.created_at).getHours()).padStart(2, "0")
            }}:{{
              String(new Date(message.created_at).getMinutes()).padStart(2, "0")
            }}
          </div>
        </div>
      </div>
      <!-- <div v-else class="w-full h-[86vh] flex items-center justify-center">
        <span class="loading loading-dots loading-lg text-neutral-400"></span>
      </div> -->
    </div>

    <div class="max-w-2xl w-full mx-auto">
      <form>
        <label for="chat" class="sr-only">Your message</label>
        <div
          class="flex items-center rounded-lg py-2 px-3 bg-gray-50 dark:bg-gray-700"
        >
          <div>
            <div v-if="!isUploading">
              <label
                for="file"
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
              </label>
              <input
                type="file"
                id="file"
                class="hidden"
                @change="handleFile"
              />
            </div>
            <div v-else class="px-2.5">
              <span class="loading loading-spinner loading-sm"></span>
            </div>
          </div>

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
            v-model="message"
            @keydown.enter.prevent="sendMessage"
            id="chat"
            rows="1"
            class="block mx-4 p-2.5 w-full text-sm text-gray-900 bg-white rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Your message..."
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
  <Teleport to="body">
    <div
      @keydown.enter="sendTemplate"
      v-if="showModal"
      class="absolute top-0 left-0 bg-[#00000083] w-full h-screen z-9999 flex justify-center items-center dark:text-black"
      @click.self="showModal = false"
    >
      <div class="bg-white w-fit p-5 rounded">
        <div class="leading-8">
          <div class="flex items-center justify-between">
            <span>#update</span>
            <div class="flex items-center gap-2 border px-2 rounded">
              <label for="check">Custom text:</label>
              <input
                v-model="isCustomText"
                type="checkbox"
                id="check"
                class="toggle toggle-sm"
              />
            </div>
          </div>
          📍
          <select v-model="service">
            <option value="CYCLE">CYCLE</option>
            <option value="SHIFT">SHIFT</option>
            <option value="BREAK">BREAK</option>
          </select>
          updated location:<br />
          <input
            type="text"
            class="border-b w-full leading-normal"
            v-model="location"
          />
          <br />
          <div>
            <div v-if="isCustomText" class="h-20 my-2">
              <textarea
                v-model="customText"
                class="textarea w-full dark:bg-white dark:border-gray-300"
                placeholder="Custom text"
              ></textarea>
            </div>
            <div v-else class="h-20 my-2">
              📅Date:
              <input
                type="text"
                class="border-b leading-normal"
                v-model="date"
              /><br />
              🕙 Time: From
              <input
                type="text"
                class="border-b w-30 leading-normal"
                v-model="startTime"
              />
              to
              <input
                type="text"
                class="border-b w-30 leading-normal"
                v-model="endTime"
              />
            </div>
          </div>

          You were at this location during the time listed above.<br />
          <select v-model="billOfLeading">
            <option value="">Leave here empty</option>
            <option value="No need to change the BOL✅">
              No need to change the BOL ✅
            </option>
            <option
              value="BOL has been changed and will be send in a few minutes✅"
            >
              BOL has been changed and will be send in a few minutes ✅
            </option>
          </select>
          <br />
          <div class="border border-dotted rounded mt-3 px-3">
            🔴 Please pay attention to the following:<br />
            🔺 Make sure your profile is filled out correctly<br />
            🔺 If you pick up a load, don’t forget to send the documents<br />
            🔺 If an officer stops you, use the BOL we sent you<br />
          </div>
          🦅 Best regards, PHOENIX ELD SERVICE 🤝
        </div>
        <button
          @click="sendTemplate(e)"
          class="btn btn-active btn-info w-full mt-5 text-white"
        >
          <span
            v-if="sending"
            class="loading loading-spinner loading-sm"
          ></span>
          <span v-else>Send</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>
