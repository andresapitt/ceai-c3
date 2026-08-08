# Disclosure copy for dictation

**From:** Rubén Salvatierra, Communicator
**In:** Tomás's handoff, criterion 4 and the closing note of `10-voice-design-spec.md`
**To:** Nadia Kaufman, Maker
**Gate:** Delia Fontán, for the compliance reading

---

## The brief I was given

Tomás asked for one sentence saying that the browser turns your voice into text, that we only receive the words, and that we keep neither. He asked me not to write it like a lawyer.

He is right that it matters. He is wrong that it is one sentence. There are two different moments and they need two different registers.

---

## Moment one: the microphone button itself

Nobody reads a privacy notice before pressing a button. They read the button.

**Spanish:** `Dictar tu pregunta`
**English:** `Dictate your question`

Not "voice input". Not "speech to text". Not a microphone icon on its own, which a good share of this audience will read as "record a voice message and send it to a person", which is exactly what it does not do. The verb tells them what happens and the noun tells them what comes out.

While it is running:

**Spanish:** `Escuchando. Hablá y después revisá el texto antes de enviar.`
**English:** `Listening. Speak, then check the text before you send.`

That second clause is doing real work. It sets the expectation that the text will need checking, so the first wrong word is a normal thing rather than a broken thing. Tomás's criterion 1 is a design decision. This sentence is what makes people understand it.

---

## Moment two: the standing privacy line

The current line reads:

> Tus mensajes se envían a Google Gemini para generar la respuesta. No guardamos la conversación.

Replacing it with:

**Spanish**

> Tus mensajes se envían a Google Gemini para generar la respuesta. Si dictás, la voz la convierte en texto tu propio navegador, Google o Apple según cuál uses, y a nosotros nos llega solo el texto. No guardamos la conversación ni el audio.

**English**

> Your messages are sent to Google Gemini to generate the reply. If you dictate, your own browser turns your voice into text, Google or Apple depending which you use, and only the text reaches us. We store neither the conversation nor the audio.

Three notes on why it is worded that way.

**"Tu propio navegador" carries the whole idea.** It locates the processing somewhere the person already trusts and already chose, which is true and which is the honest reassurance. The alternative phrasing, "a third party speech service", is accurate and tells them nothing.

**Naming Google and Apple is not optional.** If we say "your browser" and stop, we have implied the audio stays on the phone. It does not. I would rather the line be nine words longer.

**"Ni el audio" has to be there.** The existing line says we do not store the conversation. Someone reading it after speaking will want to know specifically about the recording, and silence on the point reads as evasion.

---

## The failure sentences

Four causes, and Tomás asked for four different lines. I would not write four. I would write four that all end the same way, because the ending is the only part that matters to the person reading it.

| Cause | Spanish | English |
|---|---|---|
| Permission refused | `No pudimos usar el micrófono. Revisá el permiso del navegador, o escribí tu pregunta.` | `We could not use the microphone. Check your browser's permission, or type your question.` |
| No microphone found | `No encontramos un micrófono. Escribí tu pregunta y te respondemos igual.` | `We could not find a microphone. Type your question and we will answer just the same.` |
| Nothing heard | `No se escuchó nada. Probá de nuevo o escribí tu pregunta.` | `We did not hear anything. Try again, or type your question.` |
| Connection problem | `No se pudo transcribir. Probá de nuevo o escribí tu pregunta.` | `We could not transcribe that. Try again, or type your question.` |

Every one ends in "or type your question". That is deliberate and it is the same instinct as the phone number at the bottom of every dead end on this site. A person who has just failed at something needs the next step in the same breath, not in a help page.

Note what is absent: no "Error", no code, no "please", no apology longer than the fix. And nothing anywhere says "unsupported browser", because a person on Firefox will never see any of this. The button will not be there.

---

## One thing I would not do

I would not announce this feature. No Instagram post saying "now you can talk to our assistant".

The people this is for are not going to come to the site because of a new input method, and framing it as an accessibility feature invites exactly the wrong self-identification. Nobody wants to press the button for people who cannot type properly.

Let it sit there and be found. If it gets used, that is the evidence. If it does not, we have lost nothing but a week of Nadia's time, and I would rather find that out quietly than after a campaign.
