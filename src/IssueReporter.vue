<template>
  <div class="issueReporter">
    <button data-testid="trigger" class="ir__trigger" @click="openModal" aria-label="Report Issue">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           aria-hidden="true">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
        <line x1="4" y1="22" x2="4" y2="15"/>
      </svg>
    </button>

    <div v-if="open" data-testid="modal" class="ir__overlay" @click.self="open = false">
      <div class="ir__modal">
        <h2 class="ir__title">Report Issue</h2>

        <template v-if="!issueUrl">
          <div class="ir__fields">
            <div class="ir__field">
              <label class="ir__label" for="ir-title">Title</label>
              <input
                id="ir-title"
                data-testid="title"
                class="ir__input"
                v-model="form.title"
                placeholder="Short summary"
              />
            </div>
            <div class="ir__field">
              <label class="ir__label" for="ir-type">Type</label>
              <select id="ir-type" data-testid="type" class="ir__select" v-model="form.type">
                <option v-for="t in issueTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div class="ir__field">
              <label class="ir__label" for="ir-desc">Description</label>
              <textarea
                id="ir-desc"
                data-testid="description"
                class="ir__textarea"
                v-model="form.description"
                placeholder="Steps to reproduce, expected behaviour, etc."
                rows="5"
              />
            </div>
            <div class="ir__context">
              <span class="ir__label">Context</span>
              <span class="ir__contextValue">{{ contextText }}</span>
            </div>
          </div>

          <div class="ir__error" v-if="error">{{ error }}</div>

          <div class="ir__actions">
            <button class="ir__btn ir__btn--ghost" @click="open = false">Cancel</button>
            <button data-testid="submit" class="ir__btn ir__btn--primary" :disabled="submitting" @click="handleSubmit">
              {{ submitting ? 'Submitting…' : 'Submit Issue' }}
            </button>
          </div>
        </template>

        <template v-else>
          <p class="ir__successMsg">Issue created successfully.</p>
          <a data-testid="issue-link" class="ir__issueLink" :href="issueUrl" target="_blank" rel="noopener">{{ issueUrl }}</a>
          <div class="ir__actions">
            <button class="ir__btn ir__btn--ghost" @click="open = false">Close</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const props = defineProps({
  submit: { type: Function, required: true },
  context: { type: [String, Object], default: null },
  issueTypes: {
    type: Array,
    default: () => [
      { label: 'Bug', value: 'bug' },
      { label: 'Feature Request', value: 'enhancement' },
    ],
  },
})

const open = ref(false)
const form = reactive({ title: '', type: 'bug', description: '' })
const error = ref('')
const submitting = ref(false)
const issueUrl = ref('')

const contextText = computed(() => {
  if (props.context) return typeof props.context === 'string' ? props.context : JSON.stringify(props.context)
  return window.location.href
})

function openModal() {
  Object.assign(form, { title: '', type: 'bug', description: '' })
  error.value = ''
  issueUrl.value = ''
  open.value = true
}

async function handleSubmit() {
  error.value = ''
  submitting.value = true
  try {
    const result = await props.submit({
      title: form.title,
      description: form.description,
      type: form.type,
      context: contextText.value,
    })
    issueUrl.value = result.url
  } catch (e) {
    error.value = e.message
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.issueReporter {
  font-family:system-ui;
}

.ir__trigger {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  width: 48px;
  height: 48px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  color: #1a1a1a;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}

.ir__overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.ir__modal {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 24px;
  width: 480px;
  max-width: 95vw;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.ir__title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px;
}

.ir__fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ir__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ir__label {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ir__input,
.ir__select,
.ir__textarea {
  padding: 8px 10px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fafafa;
  color: #111;
  font: inherit;
  font-size: 14px;
}

.ir__input:focus,
.ir__select:focus,
.ir__textarea:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
}

.ir__textarea {
  resize: vertical;
}

.ir__context {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ir__contextValue {
  font-size: 12px;
  color: #888;
  font-family: monospace;
  word-break: break-all;
}

.ir__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.ir__btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid transparent;
}

.ir__btn--ghost {
  background: transparent;
  border-color: #d0d0d0;
  color: #444;
}

.ir__btn--primary {
  background: #1a1a1a;
  color: #fff;
}

.ir__btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ir__error {
  padding: 8px 12px;
  background: #fff0f0;
  border: 1px solid #f5c6c6;
  border-radius: 4px;
  color: #c0392b;
  font-size: 13px;
  margin-top: 10px;
}

.ir__successMsg {
  font-size: 14px;
  color: #111;
  margin-bottom: 10px;
}

.ir__issueLink {
  display: block;
  font-size: 12px;
  color: #4a90e2;
  word-break: break-all;
  margin-bottom: 4px;
}
</style>
