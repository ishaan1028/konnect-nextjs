/**
 * Everything the demo-activity job "says", in each showcase person's voice.
 * The job recognizes (and after a few days removes) its own comments and
 * messages by these exact texts, so it never touches anything a person wrote.
 * Keep them different from the seed's texts for the same reason.
 */

/** Direct messages to Dario, by who sends them. */
export const MESSAGES_BY_PERSON: Record<string, readonly string[]> = {
  "maya.k": [
    "Just developed a new roll, sending you the best ones 📷",
    "Portra or Ektar for the weekend trip? Help me decide",
    "Found a vintage camera shop near the station, you'd love it",
    "Golden hour walk later? The light's going to be great",
    "Your last post had such nice framing 👌",
    "I finally fixed my light leak problem 🎉",
    "Coffee and a photo walk on Sunday?",
    "Do you still have that 50mm lens? Can I borrow it?",
  ],
  "arjun.codes": [
    "Shipped my side project last night 🚀 want to try it?",
    "Hackathon this weekend, you in?",
    "Okay I finally switched to a split keyboard. No regrets",
    "Found a bug that only happens on Tuesdays. I'm not kidding 😅",
    "Sending you that article about database indexes I mentioned",
    "Lunch tomorrow? I owe you one for the code review",
    "Your app idea is still on my mind, let's sketch it out",
    "Deploy went green on the first try. Celebrating ☕",
  ],
  "zoe.travels": [
    "Just landed in Lisbon ✈️ the light here is unreal",
    "Have you been to Kyoto? Planning my spring trip",
    "Sending you my packing list, it's a work of art 😄",
    "Saw the most ridiculous sunset tonight. Photos soon 🌅",
    "Road trip down the coast next month?",
    "Found a café with a view you need to see",
    "Missed my train and found the best bakery. Win.",
    "What's on your travel list this year?",
  ],
  "leo.bakes": [
    "New sourdough batch came out perfect 🍞 saving you a loaf",
    "Trying a cardamom bun recipe today, want to taste test?",
    "Pop by the bakery this weekend? First coffee's on me ☕",
    "My starter is officially older than my plants 😂",
    "Cookies are out of the oven. Just saying 🍪",
    "Croissant or pain au chocolat? Important question",
    "Experimenting with a strawberry tart, your post inspired me 🍓",
    "The bakery's doing a pop-up on Saturday, come by!",
  ],
  "sana.draws": [
    "Doodled Pixel for you 🐾 sending it now",
    "Starting a new sketchbook today, the first page is always scary",
    "Art market this Sunday, want to come along?",
    "Your photos would make amazing illustration references ✏️",
    "Finished the poster commission! Finally 🎨",
    "Blue version or the coral one? I can't decide",
    "Coffee and sketching later? ☕",
    "Found the perfect pen. My life is changed",
  ],
};

/** Replies when Dario (a visitor on the demo account) messages someone. */
export const REPLIES = [
  "Haha yes! 😄",
  "Sounds good, see you then 👍",
  "Omg yes, let's do it",
  "Wait, really? Tell me more",
  "100% agree",
  "Love that! ❤️",
  "Sorry, just saw this! Yes!",
  "Haha you're the best",
  "Deal 🤝",
  "Let me check and get back to you",
  "That's so cool!",
  "Yesss 🙌",
  "Can't wait!",
  "Ha, classic",
  "Okay, you've convinced me",
  "Good call 👌",
];

/** Comments that suit any post. */
export const GENERAL_COMMENTS = [
  "Love this one 😍",
  "The colors here 🔥",
  "Okay, this is wallpaper material",
  "Saving this for inspiration!",
  "How did you get this light?",
  "Such a vibe ✨",
  "This made my day",
  "Frame-worthy, honestly",
  "You've been posting bangers lately 👏",
  "Need the story behind this one",
  "Absolutely stunning",
  "This is so peaceful",
  "Can't stop looking at this",
  "Great shot, Dario 📸",
  "Okay, now I'm jealous 😄",
  "The composition 👌",
  "Instant favourite",
  "More of these please!",
];

/** Comments for Dario's seeded posts (supabase/seed/posts.json), by post id. */
export const COMMENTS_BY_POST: Record<string, readonly string[]> = {
  // Yosemite
  "5eed1000-0000-4000-8000-000000000015": [
    "Which trail was this? I need to go",
    "Those cliffs are unreal 🏔️",
    "Yosemite never disappoints",
    "Was it busy up there?",
    "The river in front is perfect",
  ],
  // Pixel the puppy
  "5eed1000-0000-4000-8000-000000000016": [
    "PIXEL 🐾",
    "Those eyes 🥺",
    "I would do anything for Pixel",
    "How big is he going to get?",
    "Pixel deserves his own account",
  ],
  // New York taxis
  "5eed1000-0000-4000-8000-000000000017": [
    "Peak New York 🚕",
    "I can hear the honking from here 😄",
    "Miss this city so much",
    "Which street is this?",
    "The yellow pops so well",
  ],
  // Strawberries
  "5eed1000-0000-4000-8000-000000000018": [
    "Smoothie recipe please 🍓",
    "These look so fresh",
    "Strawberry tart incoming?",
    "Market finds are the best finds",
    "Now I'm hungry",
  ],
};

// Texts from the job's first version: still recognized, so cleanup removes them.
const RETIRED_COMMENTS = [
  "This is such a good shot 😍",
  "Okay, now I need to go here.",
  "The colors in this one 🔥",
  "How did you get this light?",
  "Love this one, Dario 👏",
];
const RETIRED_MESSAGES = [
  "Hey! Saw your latest post, so good 😄",
  "Coffee this weekend? ☕",
  "Did you try that place I sent you?",
  "Just landed, catch up later? ✈️",
  "Sending you the photos from Saturday 📸",
  "How's your week going?",
];

/** Every comment text the job can write: how cleanup recognizes its own. */
export const JOB_COMMENTS = [
  ...new Set([...GENERAL_COMMENTS, ...Object.values(COMMENTS_BY_POST).flat(), ...RETIRED_COMMENTS]),
];

/** Every message text the job can write. */
export const JOB_MESSAGES = [
  ...new Set([...Object.values(MESSAGES_BY_PERSON).flat(), ...REPLIES, ...RETIRED_MESSAGES]),
];
