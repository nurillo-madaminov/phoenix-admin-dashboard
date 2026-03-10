<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabase";

const router = useRouter();

const email = ref("");
const password = ref("");

const login = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  });
  if (error) {
    alert(error.message);
    console.log(email.value, password.value);
    return;
  }
  router.push("/dashboard");
};
</script>

<template>
  <div class="hero bg-base-200 min-h-screen">
    <div class="card bg-base-100 w-full max-w-sm shrink-0 shadow-2xl">
      <div class="card-body">
        <fieldset class="fieldset">
          <label class="label">Email</label>
          <input
            type="email"
            v-model="email"
            class="input"
            placeholder="Email"
          />
          <label class="label">Password</label>
          <input
            type="password"
            v-model="password"
            class="input"
            placeholder="Password"
          />
          <button class="btn btn-neutral mt-4" @click="login()">Login</button>
        </fieldset>
      </div>
    </div>
  </div>
</template>
