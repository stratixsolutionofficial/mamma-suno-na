// =====================================================================
//  MAMMA, SUNAO NA  ·  content.js
// =====================================================================
//  Saara content yahin hai. Isse edit karke poora experience badal jaata hai.
//
//  Markers (same as the spec docs):
//    "PLACEHOLDER"        = abhi pata nahi. Jo bhi cheez is pe depend karti hai,
//                           wo Mamma ko nahi dikhegi jab tak bhari na jaaye.
//    "CONFIRM:<value>"    = <value> abhi use ho raha hai, par admin.html me
//                           "please confirm" list me dikhega. Confirm karne ke
//                           liye bas "CONFIRM:" hata dijiye.
//
//  Questions me names {{tokens}} se aate hain (e.g. {{bhaiya_bade}}), isliye
//  neeche PEOPLE me ek naam badlo toh har sawaal apne aap update ho jaata hai.
//
//  Photos: files ko mamma-sunao-na/photos/ me daaliye aur PHOTOS me "src" bhariye.
//  Audio:  files ko mamma-sunao-na/audio/ me daaliye (m4a/mp3/webm/ogg).
// =====================================================================

const EDITION = {
  slug: "mamma-birthday-2026",
  title: "{{addressWord}}, Sunao Na",
  addressWord: "Mamma",
  occasion: "birthday",
  occasionDate: "PLACEHOLDER",          // "2026-MM-DD"  -> unlocks at 00:00 IST that day
  timezoneOffset: "+05:30",             // Asia/Kolkata
  localeDefault: "hinglish",            // "hinglish" | "hindi"
  theme: "maa-haldi",
  pin: "231070",                        // digits (4-6). PLACEHOLDER = no PIN screen.
  pinHint: "{{sunny}} ka janamdin (DDMM)",
  helpContact: { label: "Sunny", phone: "PLACEHOLDER" },  // "+91XXXXXXXXXX"
  settings: {
    reveal: {
      enabled: true,
      // false = diya/cake reveal plays every time the site is opened at its main
      //         address (a "Skip to the book" link lets her skip it after the first time)
      // true  = plays only once on a phone, then always opens the album
      playOncePerDevice: false,
      diyaIntro: true,
      cake: { enabled: true, blowToExtinguish: true },
      // 5 candles = aapka ghar
      candles: ["papaji", "sunny", "gunjan", "mickey", "mamma"],
      montage: { enabled: true, maxSeconds: 90 },
      tributeOnReveal: false             // departed siblings never on the birthday reveal
    },
    greetings: { enabled: true, showBeforeKitaab: true },
    kitaab: { suggestedStartChapter: "janamdin", showAskedBy: true, followupsEnabled: true },
    recording: { segmentMaxSeconds: 600, chunkSeconds: 10, silenceNudgeSeconds: 8, bitrate: 48000 },
    backupNudgeEvery: 5,                 // har 5 jawab ke baad "bachchon ko copy bhejein?"
    // Cloud backup to Vercel Blob (see api/ and DEPLOY.md). enabled:false ->
    // pure on-device, no network. 'space' is the (unguessable) folder prefix
    // for this edition's uploads; change it per edition.
    backup: { enabled: true, space: "mamma-2026-kahani-7f3a9c" }
  }
};

// ---------------------------------------------------------------------
//  PEOPLE
//  callByKids      = bachche inhe kya bulaate hain (questions isi voice me hain)
//  callByRecipient = Mamma inhe kya bulaati hain  ({{key.her}})
//  callForRecipient= ye Mamma ko kya bulaate hain  ({{askerAddress}})
// ---------------------------------------------------------------------
const PEOPLE = [
  { key: "mamma", role: "recipient", name: "Mamma", formalName: "PLACEHOLDER", nickname: "PLACEHOLDER",
    gender: "f", alive: true, birthOrder: "CONFIRM:6", notes: "Hometown Delhi. 7 siblings total including her." },

  { key: "papaji", role: "spouse", name: "Papaji", callByKids: "Papaji", callByRecipient: "CONFIRM:Papaji",
    gender: "m", alive: true, photo: "P-REVEAL-PAPAJI" },

  { key: "sunny", role: "child", name: "Sunny", gender: "m", birthOrder: 1, spouse: "gunjan",
    callForRecipient: "Mamma", photo: "P-REVEAL-SUNNY" },
  { key: "mickey", role: "child", name: "Mickey", gender: "CONFIRM:unknown", birthOrder: 2,
    callForRecipient: "Mamma", photo: "P-REVEAL-MICKEY" },
  { key: "gunjan", role: "child_in_law", name: "Gunjan", gender: "f", spouse: "sunny",
    callForRecipient: "CONFIRM:Mummy", relation: "Mamma ki bahu", photo: "P-REVEAL-GUNJAN" },

  { key: "nanaji", role: "parent", relation: "Mamma ke Pitaji", callByKids: "CONFIRM:Nanaji",
    callByRecipient: "CONFIRM:Pitaji", gender: "m", alive: "PLACEHOLDER" },
  { key: "naniji", role: "parent", relation: "Mamma ki Mummy", callByKids: "CONFIRM:Naniji",
    callByRecipient: "CONFIRM:Mummy", gender: "f", alive: "PLACEHOLDER" },

  { key: "jiji_badi", role: "sibling", relation: "Mamma ki sabse badi behen", name: "PLACEHOLDER",
    callByKids: "CONFIRM:Badi Mausiji", callByRecipient: "CONFIRM:Badi Jiji", gender: "f", alive: false,
    birthOrder: "CONFIRM:1", elder: true, photo: "P-Q-JIJI-BADI" },
  { key: "jiji_chhoti", role: "sibling", relation: "Mamma ki doosri badi behen", name: "PLACEHOLDER",
    callByKids: "CONFIRM:Chhoti Mausiji", callByRecipient: "CONFIRM:Chhoti Jiji", gender: "f", alive: false,
    birthOrder: "CONFIRM:3", elder: true, photo: "P-Q-JIJI-CHHOTI" },
  { key: "bhaiya_bade", role: "sibling", relation: "Mamma ke sabse bade bhai", name: "PLACEHOLDER",
    callByKids: "CONFIRM:Bade Mamaji", callByRecipient: "CONFIRM:Bade Bhaiya", gender: "m", alive: true,
    birthOrder: "CONFIRM:2", elder: true, spouseCallByKids: "CONFIRM:Badi Mamiji", photo: "P-Q-BADE-MAMAJI" },
  { key: "bhaiya_manjhle", role: "sibling", relation: "Mamma ke doosre bhai", name: "PLACEHOLDER",
    callByKids: "CONFIRM:Manjhle Mamaji", callByRecipient: "CONFIRM:Manjhle Bhaiya", gender: "m", alive: false,
    birthOrder: "CONFIRM:4", elder: "CONFIRM:true", photo: "P-Q-MANJHLE-MAMAJI" },
  { key: "bhaiya_sanjhle", role: "sibling", relation: "Mamma ke teesre bhai", name: "PLACEHOLDER",
    callByKids: "CONFIRM:Sanjhle Mamaji", callByRecipient: "CONFIRM:Sanjhle Bhaiya", gender: "m", alive: true,
    birthOrder: "CONFIRM:5", elder: "CONFIRM:true", spouseCallByKids: "CONFIRM:Sanjhli Mamiji", photo: "P-Q-SANJHLE-MAMAJI" },
  { key: "bhai_chhote", role: "sibling", relation: "Mamma ke sabse chhote bhai", name: "PLACEHOLDER",
    callByKids: "CONFIRM:Chhote Mamaji", callByRecipient: "PLACEHOLDER", gender: "m", alive: false,
    birthOrder: "CONFIRM:7", elder: "CONFIRM:false", photo: "P-Q-CHHOTE-MAMAJI" }
];

const PLACES = {
  childhood_home: "CONFIRM:Delhi wala ghar",
  hometown: "Delhi",
  sasural: "PLACEHOLDER",
  current_home: "PLACEHOLDER"
};

const RECIPIENT_EXTRA = {
  festivals: ["CONFIRM:Diwali", "CONFIRM:Holi", "CONFIRM:Raksha Bandhan", "CONFIRM:Bhai Dooj", "CONFIRM:Karva Chauth", "CONFIRM:Lohri"],
  eras: { childhood: "CONFIRM:1970s", marriage: "CONFIRM:1990s" },
  avoidTopics: []                       // e.g. ["health"] -> questions with that tag are hidden
};

// ---------------------------------------------------------------------
//  CHAPTERS  (palette: haldi | sindoor | inland | leaf | dusk | marigold)
//  motif: diya | rangoli-lotus | rangoli-star | jaali | paisley | kite | mango | toran | inland-letter
//  enabled: false  -> chapter chhupa dijiye
// ---------------------------------------------------------------------
const CHAPTERS = [
  { key: "janamdin", number: 0, title: "Janamdin Special", deva: "जन्मदिन स्पेशल", subtitle: "Aaj aapka din hai. Shuruaat yahin se.", palette: "haldi", motif: "diya", cover: "P-CH-JANAMDIN" },
  { key: "shuruaat", number: 1, title: "Shuruaat", deva: "शुरुआत", subtitle: "Jahan se sab shuru hua.", palette: "haldi", motif: "rangoli-lotus", cover: "P-CH-SHURUAAT" },
  { key: "delhi-ghar", number: 2, title: "{{hometown}} Wala Ghar", deva: "दिल्ली वाला घर", subtitle: "Aangan, chhat, aur wo galiyan.", palette: "haldi", motif: "jaali", cover: "P-CH-DELHI" },
  { key: "nanaji-naniji", number: 3, title: "{{nanaji}} aur {{naniji}}", deva: "नानाजी और नानीजी", subtitle: "Jinhone aapko banaya.", palette: "leaf", motif: "paisley", cover: "P-CH-PARENTS" },
  { key: "saat-bhai-behen", number: 4, title: "Saat Bhai-Behen", deva: "सात भाई-बहन", subtitle: "Ek ghar, saat bachche, aur bahut saara shor.", palette: "marigold", motif: "kite", cover: "P-CH-SIBLINGS" },
  { key: "jiji", number: 5, title: "Badi Jiji, Chhoti Jiji", deva: "बड़ी जीजी, छोटी जीजी", subtitle: "Do badi behenein, jo maa jaisi bhi thi.", palette: "dusk", motif: "paisley", cover: "P-CH-JIJI" },
  { key: "bhaiya-log", number: 6, title: "Bhaiya Log", deva: "भैया लोग", subtitle: "Chaar bhai, chaar kahaniyan.", palette: "marigold", motif: "kite", cover: "P-CH-BHAIYA" },
  { key: "school", number: 7, title: "School, Saheliyan aur Shararatein", deva: "स्कूल, सहेलियाँ और शरारतें", subtitle: "Sach batana, koi nahi sun raha.", palette: "haldi", motif: "mango", cover: "P-CH-SCHOOL" },
  { key: "jawani", number: 8, title: "Jab {{addressWord}} Jawan Thi", deva: "जब मम्मा जवान थीं", subtitle: "Gaane, filmein aur sapne.", palette: "dusk", motif: "paisley", cover: "P-CH-JAWANI" },
  { key: "rishta-shaadi", number: 9, title: "Rishta aur Shaadi", deva: "रिश्ता और शादी", subtitle: "{{papaji}} kaise aaye zindagi mein.", palette: "sindoor", motif: "rangoli-star", cover: "P-CH-SHAADI" },
  { key: "sasural", number: 10, title: "Sasural, Naya Ghar", deva: "ससुराल, नया घर", subtitle: "Ek naya aangan, naye log.", palette: "leaf", motif: "jaali", cover: "P-CH-SASURAL" },
  { key: "papaji-aur-aap", number: 11, title: "{{papaji}} aur Aap", deva: "पापाजी और आप", subtitle: "Itne saal, itni baatein.", palette: "sindoor", motif: "diya", cover: "P-CH-PAPAJI" },
  { key: "sunny-aaya", number: 12, title: "{{sunny}} Aaya", deva: "सनी आया", subtitle: "Jab aap pehli baar {{addressWord}} bani.", palette: "haldi", motif: "rangoli-lotus", cover: "P-CH-SUNNY" },
  { key: "mickey-aaya", number: 13, title: "{{mickey}} Ka Aana", deva: "मिकी का आना", subtitle: "Ghar mein ek aur shararti.", palette: "haldi", motif: "rangoli-lotus", cover: "P-CH-MICKEY" },
  { key: "maa-banna", number: 14, title: "Maa Banna", deva: "माँ बनना", subtitle: "Do bachche, ek {{addressWord}}.", palette: "marigold", motif: "rangoli-star", cover: "P-CH-MAA" },
  { key: "beech-ke-saal", number: 15, title: "Ghar, Zimmedari aur Beech ke Saal", deva: "घर, ज़िम्मेदारी और बीच के साल", subtitle: "Jo aapne chupchaap sambhala.", palette: "dusk", motif: "jaali", cover: "P-CH-BEECH" },
  { key: "gunjan-naye-rishte", number: 16, title: "{{gunjan}} aur Naye Rishte", deva: "गुंजन और नए रिश्ते", subtitle: "Ghar mein bahu aayi, aur {{addressWord}} bani saas.", palette: "leaf", motif: "paisley", cover: "P-CH-GUNJAN" },
  { key: "yaadon-mein", number: 17, title: "Jo Yaadon Mein Hain", deva: "जो यादों में हैं", subtitle: "Unki baatein, unki hasi.", palette: "dusk", motif: "diya", cover: null, gated: true,
    // four-diya ritual, in birth order
    diyas: ["jiji_badi", "jiji_chhoti", "bhaiya_manjhle", "bhai_chhote"] },
  { key: "khushiyan", number: 18, title: "Choti Choti Khushiyan", deva: "छोटी छोटी खुशियाँ", subtitle: "Jo din ko achha bana dein.", palette: "haldi", motif: "mango", cover: "P-CH-KHUSHIYAN" },
  { key: "aaj-ki-mamma", number: 19, title: "Aaj Ki {{addressWord}}", deva: "आज की मम्मा", subtitle: "Abhi, isi pal.", palette: "marigold", motif: "toran", cover: "P-COVER" },
  { key: "seekh", number: 20, title: "Jo Aapne Seekha", deva: "जो आपने सीखा", subtitle: "Zindagi ki asli padhai.", palette: "leaf", motif: "rangoli-lotus", cover: null },
  { key: "chitthiyan", number: 21, title: "Chitthiyan", deva: "चिट्ठियाँ", subtitle: "Kuch baatein, band lifafon mein.", palette: "inland", motif: "inland-letter", cover: null }
];

// Seal suggestions ("Kisi khaas mauke pe")
const SEAL_SUGGESTIONS = [
  "{{mickey}} ki shaadi pe",
  "Pehle pote/poti ke janam pe",
  "{{sunny}}-{{gunjan}} ki 10th anniversary pe",
  "Mere agle janamdin pe"
];
// "Sirf ... ke liye" options
const SEAL_PEOPLE = ["sunny", "mickey", "gunjan", "papaji"];

// ---------------------------------------------------------------------
//  PHOTOS (shot list). src khaali = paper placeholder dikhega (alt text ke saath).
//  Example: "P-COVER": { src: "photos/mamma-cover.jpg", alt: "Mamma muskura rahi hain" }
// ---------------------------------------------------------------------
const PHOTOS = {
  "P-COVER": { src: "", alt: "Mamma muskura rahi hain", required: true },
  "P-REVEAL-1": { src: "", alt: "Poora parivaar ek saath", required: true },
  "P-REVEAL-PAPAJI": { src: "", alt: "Papaji ki photo" },
  "P-REVEAL-SUNNY": { src: "", alt: "Sunny ki photo" },
  "P-REVEAL-GUNJAN": { src: "", alt: "Gunjan ki photo" },
  "P-REVEAL-MICKEY": { src: "", alt: "Mickey ki photo" },
  "P-CH-JANAMDIN": { src: "", alt: "Mamma ka ek purana janamdin" },
  "P-CH-SHURUAAT": { src: "", alt: "Bachpan mein Mamma", required: true },
  "P-Q-BACHPAN-PHOTO": { src: "", alt: "Bachpan mein Mamma" },
  "P-Q-BACHPAN-JANAMDIN": { src: "", alt: "Bachpan ka ek tyohaar" },
  "P-CH-DELHI": { src: "", alt: "Delhi wala ghar", required: true },
  "P-Q-DELHI-GHAR": { src: "", alt: "Delhi wala ghar" },
  "P-CH-PARENTS": { src: "", alt: "Nanaji aur Naniji", required: true },
  "P-Q-NANAJI-NANIJI": { src: "", alt: "Nanaji aur Naniji" },
  "P-CH-SIBLINGS": { src: "", alt: "Mamma apne bhai-behenon ke saath", required: true },
  "P-Q-SAATON": { src: "", alt: "Mamma apne bhai-behenon ke saath" },
  "P-Q-SIBLINGS-GROUP": { src: "", alt: "Parivaar ki ek shaadi mein sab bhai-behen" },
  "P-Q-RAKHI": { src: "", alt: "Rakhi pe Mamma aur unke bhai" },
  "P-CH-JIJI": { src: "", alt: "Mamma apni Jijiyon ke saath" },
  "P-Q-JIJI-BADI": { src: "", alt: "Badi Mausiji" },
  "P-Q-JIJI-CHHOTI": { src: "", alt: "Chhoti Mausiji" },
  "P-CH-BHAIYA": { src: "", alt: "Mamma apne bhaiyon ke saath" },
  "P-Q-BADE-MAMAJI": { src: "", alt: "Bade Mamaji" },
  "P-Q-SANJHLE-MAMAJI": { src: "", alt: "Sanjhle Mamaji" },
  "P-Q-MANJHLE-MAMAJI": { src: "", alt: "Manjhle Mamaji" },
  "P-Q-CHHOTE-MAMAJI": { src: "", alt: "Chhote Mamaji" },
  "P-CH-SCHOOL": { src: "", alt: "School ke dinon mein Mamma" },
  "P-Q-SCHOOL": { src: "", alt: "School ke dinon mein Mamma" },
  "P-CH-JAWANI": { src: "", alt: "Jawani mein Mamma" },
  "P-Q-JAWANI": { src: "", alt: "Jawani mein Mamma" },
  "P-CH-SHAADI": { src: "", alt: "Mamma aur Papaji ki shaadi", required: true },
  "P-Q-SHAADI": { src: "", alt: "Mamma aur Papaji ki shaadi" },
  "P-CH-SASURAL": { src: "", alt: "Shaadi ke baad naye ghar mein Mamma" },
  "P-CH-PAPAJI": { src: "", alt: "Mamma aur Papaji ek safar par" },
  "P-Q-PAPAJI-TRIP": { src: "", alt: "Mamma aur Papaji ek safar par" },
  "P-CH-SUNNY": { src: "", alt: "Mamma ki god mein chhota Sunny", required: true },
  "P-Q-SUNNY-BABY": { src: "", alt: "Mamma ki god mein chhota Sunny" },
  "P-CH-MICKEY": { src: "", alt: "Mamma ki god mein chhota Mickey", required: true },
  "P-Q-MICKEY-BABY": { src: "", alt: "Mamma ki god mein chhota Mickey" },
  "P-CH-MAA": { src: "", alt: "Mamma, Sunny aur Mickey" },
  "P-CH-BEECH": { src: "", alt: "Parivaar ka ek purana tyohaar" },
  "P-CH-GUNJAN": { src: "", alt: "Sunny aur Gunjan ki shaadi mein Mamma", required: true },
  "P-Q-SUNNY-WEDDING": { src: "", alt: "Sunny aur Gunjan ki shaadi mein Mamma" },
  "P-Q-GUNJAN-FIRST": { src: "", alt: "Mamma aur Gunjan ki pehli photo" },
  "P-CH-KHUSHIYAN": { src: "", alt: "Mamma khul ke hans rahi hain" }
};

// ---------------------------------------------------------------------
//  INTRO (birthday reveal beat 3) + TOHFA LETTER
// ---------------------------------------------------------------------
const INTRO = {
  voice: "",                            // e.g. "audio/intro.m4a" (Sunny + Mickey + Gunjan, 10-20s)
  lines: ["Happy Birthday {{addressWord}}!", "Ye aapke liye hai…"],
  tohfaVoice: "",                       // optional: Sunny reading the letter, e.g. "audio/tohfa.m4a"
  tohfaLetter: `{{addressWord}},
Aapne hamesha humari kahaniyan suni. Ab humari baari hai sunne ki.

Isme kuch sawaal hain: {{hometown}} wala ghar, {{nanaji}}-{{naniji}}, aapke saat bhai-behen, school ki saheliyan, {{papaji}}, {{sunny}} aur {{mickey}} ka aana, {{gunjan}} ka ghar aana… aur wo sab jo humne kabhi poochha hi nahi.

Jab mann ho, ek sawaal ka jawab dijiye. Bol ke, ya likh ke. Koi jaldi nahi.
Jo sawaal achha na lage, use chhod dijiye.

Aapki aawaaz humare liye sabse keemti tohfa hai.

Happy Birthday, {{addressWord}}.`
};

// ---------------------------------------------------------------------
//  GREETINGS
//  status: "approved" -> Mamma ko dikhega. Baaki ("pending") sirf admin.html me.
//  placement: "wall" (janamdin) | "tribute" (sirf "Jo Yaadon Mein Hain" ke end me)
//  Fields: text, memory, audio ("audio/x.m4a"), video ("videos/x.mp4"), photo (PHOTOS id ya path)
//  Greeting collect karne ke liye: admin.html -> "Greeting links" (g.html).
// ---------------------------------------------------------------------
const GREETINGS = [
  { from: "Papaji", person: "papaji", relation: "Mamma ke jeevansathi", sort: 1, featured: true, playInReveal: true, status: "pending",
    ask: "{{addressWord}} ke liye kuch aisa kahiye jo aap roz nahi keh paate. Aur pehli mulaqat ki ek yaad.",
    text: "", memory: "", audio: "", video: "", photo: "P-REVEAL-PAPAJI" },
  { from: "Sunny", person: "sunny", relation: "Bada beta", sort: 2, playInReveal: true, status: "pending",
    ask: "Bachpan ki ek yaad jab {{addressWord}} ne aapke liye kuch khaas kiya.",
    text: "", memory: "", audio: "", photo: "P-REVEAL-SUNNY" },
  { from: "Gunjan", person: "gunjan", relation: "Bahu", sort: 3, playInReveal: true, status: "pending",
    ask: "Pehli baar jab aap Mummy se mili, aur ab wo aapke liye kya hain.",
    text: "", memory: "", audio: "", photo: "P-REVEAL-GUNJAN" },
  { from: "Mickey", person: "mickey", relation: "Chhota bachcha", sort: 4, playInReveal: true, status: "pending",
    ask: "Bachpan ki ek yaad jab {{addressWord}} ne aapke liye kuch khaas kiya.",
    text: "", memory: "", audio: "", photo: "P-REVEAL-MICKEY" },
  { from: "{{bhaiya_bade}}", person: "bhaiya_bade", relation: "Mamma ke bade bhai", sort: 5, featured: true, playInReveal: true, status: "pending",
    ask: "{{hometown}} wale ghar ki ek kahani jisme aapki choti behen ho: koi shararat, koi ladai, ya koi pyaari baat. Aur ek ashirwad.",
    text: "", memory: "", audio: "", photo: "P-Q-BADE-MAMAJI" },
  { from: "{{bhaiya_bade.spouse}}", relation: "Bade Mamaji ki patni", sort: 6, status: "pending", text: "", memory: "", audio: "" },
  { from: "{{bhaiya_sanjhle}}", person: "bhaiya_sanjhle", relation: "Mamma ke bhai", sort: 7, featured: true, playInReveal: true, status: "pending",
    ask: "Bachpan ki ek kahani jisme aap aur {{addressWord}} saath the: shararat, ladai, ya koi raaz. Aur ek shubhkamna.",
    text: "", memory: "", audio: "", photo: "P-Q-SANJHLE-MAMAJI" },
  { from: "{{bhaiya_sanjhle.spouse}}", relation: "Sanjhle Mamaji ki patni", sort: 8, status: "pending", text: "", memory: "", audio: "" },
  { from: "PLACEHOLDER (Badi Mausiji ke bachche)", relation: "Mamma ki bhaanji/bhaanja", sort: 9, status: "pending",
    ask: "Mausi ke liye ek shubhkamna, aur unke saath ki ek yaad. Agar mann ho, toh apni Mummy aur Mausi ki koi baat bhi.", text: "" },
  { from: "PLACEHOLDER (Chhoti Mausiji ke bachche)", relation: "Mamma ki bhaanji/bhaanja", sort: 10, status: "pending",
    ask: "Mausi ke liye ek shubhkamna, aur unke saath ki ek yaad. Agar mann ho, toh apni Mummy aur Mausi ki koi baat bhi.", text: "" },
  { from: "PLACEHOLDER (Manjhle Mamaji ka parivaar)", relation: "Mamma ki bhabhi / bhatije", sort: 11, status: "pending",
    ask: "Bua ke liye ek shubhkamna, aur unke saath ki ek yaad.", text: "" },
  { from: "PLACEHOLDER (Chhote Mamaji ka parivaar)", relation: "Mamma ki bhabhi / bhatije", sort: 12, status: "pending",
    ask: "Bua ke liye ek shubhkamna, aur unke saath ki ek yaad.", text: "" },
  { from: "PLACEHOLDER (Mausaji, if alive)", relation: "Jijaji", sort: 13, status: "pending", text: "" },
  { from: "PLACEHOLDER (Gunjan ke Mummy-Papa)", relation: "Samdhi-Samdhan", sort: 14, status: "pending", text: "" },
  { from: "PLACEHOLDER (Papaji ke bhai-behen)", relation: "Sasural parivaar", sort: 15, status: "pending", text: "" },
  { from: "PLACEHOLDER (Mamma ki saheli)", relation: "Bachpan / school ki saheli", sort: 16, status: "pending",
    ask: "Aapki dosti ki ek yaad, aur ek shubhkamna.", text: "" },
  { from: "PLACEHOLDER (Padosi / kitty friends)", relation: "Dost", sort: 17, status: "pending", text: "" }

  // Tribute example (sirf "Jo Yaadon Mein Hain" ke end me dikhega):
  // { from: "{{bhaiya_bade}}", relation: "Mamma ke bade bhai", placement: "tribute", status: "approved",
  //   text: "Badi Jiji ki wo baat…", audio: "audio/tribute-bade-mamaji.m4a" },
];

// ---------------------------------------------------------------------
//  COPY: har UI line. [Roman, Devanagari(optional)]
// ---------------------------------------------------------------------
const COPY = {
  "gate.countdown": ["Kuch khaas aapka intezaar kar raha hai…", "कुछ ख़ास आपका इंतज़ार कर रहा है…"],
  "gate.days": ["din", "दिन"], "gate.hours": ["ghante", "घंटे"], "gate.mins": ["minute", "मिनट"],
  "pin.title": ["Apna khaas number daaliye", "अपना ख़ास नंबर डालिए"],
  "pin.wrong": ["Ek baar phir try kijiye", "एक बार फिर ट्राई कीजिए"],
  "pin.locked": ["Thodi der baad try kijiye, ya {{helpLabel}} ko call kar lijiye"],
  "pin.clear": ["Clear"],
  "reveal.lightDiya": ["{{addressWord}}, ek diya jalaiye"],
  "reveal.tap": ["Tap here"],
  "reveal.blow": ["Ab candles bujhaiye… phoonk maariye!"],
  "reveal.blowTap": ["Or tap here"],
  "reveal.wish": ["Happy Birthday {{addressWord}}", "जन्मदिन मुबारक हो"],
  "reveal.montage": ["Sabne aapke liye kuch kaha hai…"],
  "reveal.toWall": ["See all wishes"],
  "reveal.next": ["Next"],
  "reveal.skipToBook": ["Skip to the book"],
  "reveal.micAsk": ["Phoonk sunne ke liye phone aawaz sunne ki ijaazat maangega. 'Allow' dabaiye."],
  "reveal.blowMic": ["Blow with mic"],
  "reveal.listening": ["Sun rahe hain… phone ke neeche ki taraf halki si phoonk maariye"],
  "reveal.micOff": ["Phoonk sunai nahi de rahi. Koi baat nahi, candles pe tap kar dijiye."],
  "wall.title": ["Sabki Shubhkamnayein", "सबकी शुभकामनाएँ"],
  "wall.empty": ["Sabki shubhkamnayein raaste mein hain… jaldi pahunchengi."],
  "wall.memory": ["Ek yaad"],
  "wall.next": ["Aur ab, ek aur tohfa…"],
  "tohfa.explain": ["Ye aapki kitaab hai. Isme humne aapse kuch sawaal poochhe hain. Jab mann ho, ek sawaal ka jawab dijiye: bol ke ya likh ke."],
  "tohfa.open": ["Open the book"],
  "album.title": ["{{addressWord}}, Sunao Na"],
  "album.subtitle": ["Aapke janamdin par"],
  "album.today": ["Aaj ka sawaal", "आज का सवाल"],
  "album.answer": ["Answer"],
  "album.allDone": ["Aapne bahut kuch bata diya. Jab mann ho, koi bhi chapter kholiye."],
  "album.menu": ["Menu"],
  "album.resume": ["Continue where you left"],
  "chapter.label": ["Chapter", "अध्याय"],
  "chapter.start": ["Start"],
  "chapter.heavyLine": ["Ek thoda bhaari sawaal"],
  "chapter.back": ["Book"],
  "chapter.done": ["Is chapter ke saare sawaal ho gaye. Shukriya, {{addressWord}}."],
  "chapter.yaadon.intro": ["{{addressWord}}, ye unke liye hain jo ab saath nahi, par hamesha saath hain. Ek ek karke diya jalaiye."],
  "chapter.yaadon.ready": ["Unki baatein karein?"],
  "chapter.yaadon.tributes": ["Sabki yaadein unke baare mein"],
  "q.photo": ["Ye photo yaad hai?"],
  "q.speak": ["Record answer"],
  "q.write": ["Type answer"],
  "q.later": ["Later"],
  "q.notToday": ["Not today"],
  "q.heavyGate": ["Ye sawaal thoda bhaari hai, {{addressWord}}. Abhi baat karein?"],
  "q.heavyYes": ["Yes"],
  "q.heavyNo": ["Maybe later"],
  "q.saved": ["Sambhaal liya", "सँभाल लिया"],
  "q.saving": ["Sambhaal rahe hain…"],
  "q.followupYes": ["Yes, add more"],
  "q.next": ["Next"],
  "q.keepText": ["Save", "सेव करें"],
  "q.switchWrite": ["Type instead"],
  "q.switchSpeak": ["Record instead"],
  "q.yourAnswer": ["Aapka jawab"],
  "q.followupLead": ["Aur batao…"],
  "rec.idle": ["Start recording"],
  "rec.permission": ["Phone aapse puchega ki aawaz sun sakta hai kya. 'Allow' dabaiye, taaki hum aapki aawaz sambhaal sakein."],
  "rec.permissionOk": ["OK"],
  "rec.denied": ["Koi baat nahi. Settings mein jaake microphone allow kar dijiye, ya likh ke bhi bata sakti hain."],
  "rec.deniedHow": ["How?"],
  "rec.deniedIos": ["iPhone: Settings → Safari → Microphone → Allow. Phir ye page dobara kholiye."],
  "rec.deniedAndroid": ["Android: upar address bar mein taale (🔒) ko dabaiye → Permissions → Microphone → Allow."],
  "rec.listening": ["Sun rahe hain… boliye", "सुन रहे हैं… बोलिए"],
  "rec.pausedShort": ["Paused", "रुकी हुई है"],
  "rec.play": ["Play"],
  "rec.pause": ["Pause"],
  "rec.resume": ["Resume"],
  "rec.stop": ["Stop"],
  "rec.paused": ["Paused. Jab mann ho, Resume dabaiye."],
  "rec.silence": ["Aaram se, {{addressWord}}… koi jaldi nahi."],
  "rec.breath": ["Thoda saans le lijiye, phir aage bolte hain"],
  "rec.keep": ["Save"],
  "rec.more": ["Record more"],
  "rec.again": ["Record again"],
  "rec.delete": ["Delete recording"],
  "rec.deleteShort": ["Delete"],
  "rec.deleteAsk": ["Ye recording delete kar dein? Ye wapas nahi aayegi."],
  "rec.deleteYes": ["Yes, delete"],
  "rec.deleteNo": ["Cancel"],
  "rec.deleted": ["Recording delete ho gayi"],
  "rec.recovered": ["Aapki pichhli recording sambhaal li gayi hai."],
  "rec.unsupported": ["Is phone ke browser mein bolna nahi chal raha. Chrome ya Safari mein kholiye, ya likh ke bataiye."],
  "rec.labelStart": ["Start recording"],
  "rec.labelStop": ["Stop recording"],
  "write.placeholder": ["Yahan likhiye… jis bhasha mein dil kare."],
  "seal.ask": ["Isse band lifafe mein rakhein?"],
  "seal.date": ["Open on a date"],
  "seal.event": ["Open on an occasion"],
  "seal.person": ["Only for {{name}}"],
  "seal.afterMe": ["After me"],
  "seal.none": ["Keep it open"],
  "seal.confirmOpen": ["Ye sab padh payenge. Theek hai?"],
  "seal.done": ["Lifafa band ho gaya"],
  "seal.open": ["Open envelope"],
  "seal.closed": ["Band lifafa"],
  "seal.ok": ["Seal it"],
  "menu.replay": ["Replay birthday"],
  "menu.greetings": ["All wishes"],
  "menu.photos": ["Tasveerein", "तस्वीरें"],
  "menu.voices": ["Aawaazein", "आवाज़ें"],
  "menu.tohfa": ["Our letter"],
  "menu.book": ["My book"],
  "menu.lessMotion": ["Less animation"],
  "menu.hindi": ["Show in Hindi", "हिंदी में दिखाएँ"],
  "menu.help": ["Need help? Call {{helpLabel}}"],
  "menu.share": ["Send a copy to the kids"],
  "menu.close": ["Close"],
  "gallery.loading": ["Khul raha hai…", "खुल रहा है…"],
  "gallery.offline": ["Abhi load nahi ho paaya. Net check karke phir dekhiye.", "अभी लोड नहीं हो पाया। नेट जाँच कर फिर देखिए।"],
  "gallery.photos.title": ["Tasveerein", "तस्वीरें"],
  "gallery.photos.sub": ["Kuch yaadein, tasveeron mein.", "कुछ यादें, तस्वीरों में।"],
  "gallery.photos.empty": ["Abhi tasveerein jama ho rahi hain.", "अभी तस्वीरें जमा हो रही हैं।"],
  "gallery.voices.title": ["Aawaazein", "आवाज़ें"],
  "gallery.voices.sub": ["Jo pyaar logon ne bheja — unki aawaaz mein.", "जो प्यार लोगों ने भेजा — उनकी आवाज़ में।"],
  "gallery.voices.empty": ["Abhi recordings jama ho rahi hain.", "अभी रिकॉर्डिंग्स जमा हो रही हैं।"],
  "share.nudge": ["Aapke jawab sirf is phone mein hain. Bachchon ko ek copy bhej dein, taaki sab safe rahe?"],
  "share.yes": ["Yes, send"],
  "share.no": ["Later"],
  "share.preparing": ["Taiyaar kar rahe hain…"],
  "share.done": ["Copy taiyaar hai. WhatsApp pe {{helpLabel}} ko bhej dijiye."],
  "pwa.install": ["Isse apne phone ki home screen pe lagaiye, taaki roz aasaani se khul sake"],
  "pwa.ios": ["Neeche Share (⬆️) dabaiye → 'Add to Home Screen'"],
  "pwa.android": ["Upar ⋮ dabaiye → 'Add to Home screen'"],
  "book.coverTitle": ["{{addressWord}} ki Kahani"],
  "book.empty": ["Abhi kitaab khaali hai. Pehla sawaal intezaar kar raha hai."],
  "book.close": ["Close book"],
  "book.open": ["Kholne ke liye tap kijiye"],
  "book.openLabel": ["Kitaab kholiye"],
  "book.edition": ["Janamdin · 23 October {{year}}", "जन्मदिन · 23 अक्टूबर {{year}}"],
  "book.from": ["Made with ❤️"],
  "book.pages": ["{{n}} panne"],
  "book.pages1": ["1 panna"],
  "book.bookmark": ["Wahin se aage padhiye: panna {{n}}"],
  "book.contents": ["Contents"],
  "book.contentsLabel": ["Contents"],
  "book.next": ["Next page"],
  "book.prev": ["Previous page"],
  "book.waiting": ["Ye panna aapka intezaar kar raha hai", "ये पन्ना आपका इंतज़ार कर रहा है"],
  "book.said": ["{{addressWord}} ne kaha…", "{{addressWord}} ने कहा…"],
  "book.readSealed": ["Read it"],
  "book.inChapter": ["In this chapter", "इस अध्याय में"],
  "book.colophon": ["Ye kitaab {{addressWord}} ki aawaaz mein likhi gayi.", "ये किताब {{addressWord}} की आवाज़ में लिखी गई।"],
  "book.colophonPlace": ["{{hometown}}, {{year}}"],
  "book.colophonCount": ["{{kept}} jawab, {{total}} sawaal"],
  "book.end": ["Samaapt", "समाप्त"],
  "book.skipChapter": ["Turn past this chapter"],
  "menu.pageSound": ["Page-turn sound"],
  "preview.banner": ["Preview: kuch save nahi hoga (alag dabba)"],
  "g.welcome": ["{{addressWord}} ke janamdin ke liye kuch kahiye 🌼"],
  "g.thanks": ["Shukriya! {{addressWord}} ko {{date}} ko ye milega. Ye raaz hai 🤫"],
  "notfound": ["Ye pata sahi nahi lag raha."]
};

// ---------------------------------------------------------------------
//  QUESTIONS  (generated from 03-generated-experience-mamma-birthday.md §4.4)
//  Fields: key, prompt, sub, followups[], emotions[], weight(light default|medium|heavy),
//          askedBy(["hum"] default | person keys), sealedDefault, tags[], condition, photo
//  enabled: false -> sawaal chhupa dijiye
// ---------------------------------------------------------------------
const QUESTIONS = {
  "janamdin": [
    {"key": "janamdin.bachpan-ka-janamdin", "prompt": "{{addressWord}}, bachpan mein {{hometown}} wale ghar mein aapka janamdin kaise manaya jaata tha?", "sub": "Koi khaas khana, naye kapde, {{naniji}} ka koi tohfa… jo bhi yaad ho.", "followups": ["Kisi saal ka janamdin jo sabse zyada yaad hai?"],"emotions": ["yaadein", "khushi"],"photo": "P-Q-BACHPAN-JANAMDIN"},
    {"key": "janamdin.bhaiyon-ka-tohfa", "prompt": "Saat bhai-behenon wale ghar mein janamdin pe sabse zyada pyaar kaun dikhata tha?", "sub": "Aur sabse zyada chidhata kaun tha?", "emotions": ["pyaar", "hasi"]},
    {"key": "janamdin.sabse-yaadgar-tohfa", "prompt": "Aaj tak ka sabse yaadgar tohfa kaunsa tha, aur kisne diya tha?", "emotions": ["khushi", "pyaar"]},
    {"key": "janamdin.papaji-wala", "prompt": "Shaadi ke baad {{papaji}} ne pehla janamdin kaise manaya tha? Sach batana!", "emotions": ["pyaar", "hasi"],"askedBy": ["sunny", "mickey"]},
    {"key": "janamdin.humne-kab-bhula", "prompt": "Kabhi humne aapka janamdin bhula diya tha kya? Hum maafi maang lete hain pehle hi.", "emotions": ["hasi", "ladai-sulah"],"askedBy": ["sunny"]},
    {"key": "janamdin.khwahish", "prompt": "Is janamdin pe aapki ek khwahish kya hai, {{addressWord}}? Sach mein wali.", "sub": "Hum sun rahe hain.", "emotions": ["sapne"]},
  ],
  "shuruaat": [
    {"key": "shuruaat.naam", "prompt": "{{addressWord}}, aapka naam kisne rakha tha? Uske peeche koi kahani hai?", "sub": "Aur ghar mein sab aapko pyaar se kya bulaate the?", "emotions": ["yaadein"]},
    {"key": "shuruaat.pehli-yaad", "prompt": "Aapko sabse pehli cheez kya yaad hai? Bilkul pehli.", "sub": "Aankhein band kariye. Koi rang, koi aawaaz, koi chehra…", "emotions": ["yaadein"]},
    {"key": "shuruaat.chidhana", "prompt": "Bachpan mein bhai-behen aapko kis naam se chidhate the?", "emotions": ["hasi"]},
    {"key": "shuruaat.kaisi-bachchi", "prompt": "Aap bachpan mein kaisi thi? Shant, shararti, ya ziddi?", "sub": "{{naniji}} kya kehti thi aapke baare mein?", "emotions": ["hasi", "yaadein"]},
    {"key": "shuruaat.pehli-photo", "prompt": "Ye aapki sabse purani photo hai jo humein mili. Is din ke baare mein kuch yaad hai?", "emotions": ["yaadein"],"photo": "P-Q-BACHPAN-PHOTO"},
  ],
  "delhi-ghar": [
    {"key": "delhi-ghar.darwaza", "prompt": "Aankhein band karke {{hometown}} wale ghar ke darwaze se andar aaiye. Kya dikhta hai?", "sub": "Aangan, seedhiyan, chhat, kaunsa kamra kiska tha… dheere dheere batao.", "emotions": ["yaadein"],"photo": "P-Q-DELHI-GHAR"},
    {"key": "delhi-ghar.mohalla", "prompt": "Ghar kis mohalle mein tha? Wo gali kaisi thi, padosi kaise the?", "followups": ["Koi padosi jo ghar ke jaise hi the?"],"emotions": ["yaadein"]},
    {"key": "delhi-ghar.rasoi", "prompt": "{{naniji}} ki rasoi kaisi mehekti thi? Koi ek khushboo jo aaj bhi yaad hai?", "emotions": ["yaadein", "pyaar"]},
    {"key": "delhi-ghar.garmi", "prompt": "{{hometown}} ki garmi ki chhuttiyan kaise beet-ti thi? Chhat pe sona, matke ka paani, aam, kulfi… sab batao.", "emotions": ["yaadein", "khushi"]},
    {"key": "delhi-ghar.sardi", "prompt": "Aur {{hometown}} ki sardi? Dhoop mein baith ke moongphali, gajak, rewari… kaun sabse zyada kha jaata tha?", "emotions": ["yaadein", "hasi"]},
    {"key": "delhi-ghar.diwali", "prompt": "Diwali ki tayyari kaise hoti thi? Safai, mithai, patakhe… aapki duty kya hoti thi?", "emotions": ["yaadein", "khushi"]},
    {"key": "delhi-ghar.dussehra-ramlila", "prompt": "Dussehra pe Ramlila dekhne jaate the? Kiske saath, aur kaisa lagta tha?", "emotions": ["yaadein", "khushi"]},
    {"key": "delhi-ghar.ghoomna", "prompt": "Bachpan mein {{hometown}} mein ghoomne kahan jaate the? India Gate, Chandni Chowk, Qutub Minar…?", "sub": "Koi ek trip jo aaj bhi yaad hai.", "emotions": ["khushi", "yaadein"]},
    {"key": "delhi-ghar.tv-radio", "prompt": "Ghar mein pehla TV ya radio kab aaya tha? Sab milke kya dekhte ya sunte the?", "sub": "Chitrahaar, Sunday ki filmein, Vividh Bharati…", "emotions": ["yaadein", "khushi"]},
    {"key": "delhi-ghar.aawaaz", "prompt": "Us ghar ki koi aawaaz jo aap ek baar phir sunna chahengi?", "sub": "Mandir ki ghanti, sabziwale ki pukaar, kisi ki hasi…", "emotions": ["kami", "yaadein"],"weight": "medium"},
    {"key": "delhi-ghar.akela-kona", "prompt": "Ghar ka wo kona kaunsa tha jahan aap akele baithna pasand karti thi?", "emotions": ["yaadein"]},
  ],
  "nanaji-naniji": [
    {"key": "nanaji-naniji.naniji-haath", "prompt": "{{naniji}} ke haath kaise the, {{addressWord}}? Wo hamesha kya karte rehte the?", "emotions": ["pyaar", "yaadein"],"weight": "medium", "photo": "P-Q-NANAJI-NANIJI"},
    {"key": "nanaji-naniji.nanaji-baat", "prompt": "{{nanaji}} ki koi baat jo aaj bhi aapke kaan mein goonjti hai?", "emotions": ["pyaar", "seekh"],"weight": "medium"},
    {"key": "nanaji-naniji.kaam", "prompt": "{{nanaji}} kya kaam karte the? Ghar ka kharcha kaise chalta tha saat bachchon ke saath?", "emotions": ["himmat", "yaadein"],"weight": "medium"},
    {"key": "nanaji-naniji.daant", "prompt": "Sabse zyada daant kisse padti thi, {{nanaji}} se ya {{naniji}} se? Aur kis baat pe?", "emotions": ["hasi", "yaadein"]},
    {"key": "nanaji-naniji.ladli", "prompt": "Saat bachchon mein {{nanaji}} ka ladla ya ladli kaun tha? Sach batana!", "emotions": ["hasi", "pyaar"]},
    {"key": "nanaji-naniji.bina-kahe", "prompt": "Unhone kabhi khul ke nahi kaha, par aapko pata tha ki wo aapse kitna pyaar karte the. Kaise pata chalta tha?", "emotions": ["pyaar"],"weight": "medium"},
    {"key": "nanaji-naniji.naniji-sikhaya", "prompt": "{{naniji}} ne aapko kya sikhaya jo aapne humein bhi sikhaya?", "sub": "Koi dish, koi aadat, koi pooja, koi kahawat…", "emotions": ["seekh", "pyaar"]},
    {"key": "nanaji-naniji.pooch-nahi-paayi", "prompt": "Unse koi baat jo aap poochhna chahti thi, par poochh nahi paayi?", "emotions": ["kami", "dard"],"weight": "heavy", "tags": ["death"],"condition": "nanaji.is_alive == false || naniji.is_alive == false"},
    {"key": "nanaji-naniji.unki-jaisi", "prompt": "Aap mein {{naniji}} jaisa kya hai, aur {{nanaji}} jaisa kya?", "emotions": ["pyaar", "seekh"]},
  ],
  "saat-bhai-behen": [
    {"key": "bhai-behen.mahaul", "prompt": "Saat bachche ek ghar mein! Ghar ka mahaul kaisa hota tha, {{addressWord}}?", "sub": "Shor, ladai, khana, sona… sab kaise hota tha?", "emotions": ["yaadein", "hasi"],"photo": "P-Q-SAATON"},
    {"key": "bhai-behen.sona-kaise", "prompt": "Garmi mein sab chhat pe sote the? Kiske paas sone ke liye ladai hoti thi?", "emotions": ["hasi", "yaadein"]},
    {"key": "bhai-behen.sabse-badi-ladai", "prompt": "Bhai-behenon mein sabse badi ladai kis baat pe hui thi? Aur phir sulah kaise hui?", "emotions": ["ladai-sulah", "hasi"]},
    {"key": "bhai-behen.mithai-hissa", "prompt": "Mithai ya khane ka bada hissa kiske paas jaata tha? Aur aap apna hissa kaise bachati thi?", "emotions": ["hasi"]},
    {"key": "bhai-behen.khel", "prompt": "Aap sab milke kaunse khel khelte the?", "sub": "Pithu, kho-kho, stapu, ludo, carrom, patang…", "emotions": ["khushi", "yaadein"]},
    {"key": "bhai-behen.patang", "prompt": "Patang udane mein aap bhaiyon ki madad karti thi ya khud udati thi? Charkhi kaun pakadta tha?", "emotions": ["khushi", "hasi"]},
    {"key": "bhai-behen.rakhi", "prompt": "Chaar bhaiyon ko rakhi! Wo din kaisa hota tha? Sabse achha tohfa kisne diya tha?", "emotions": ["pyaar", "yaadein"],"photo": "P-Q-RAKHI"},
    {"key": "bhai-behen.bhai-dooj", "prompt": "Bhai Dooj pe tika kaise hota tha? Koi saal jo khaas yaad hai?", "emotions": ["pyaar", "yaadein"]},
    {"key": "bhai-behen.kaun-bachata", "prompt": "Jab aapko daant padti thi, toh kaun bachane aata tha?", "emotions": ["pyaar"]},
    {"key": "bhai-behen.chugli", "prompt": "Kaun sabse zyada chugli karta tha {{nanaji}}-{{naniji}} se? Aur aapne kabhi kiski chugli ki?", "emotions": ["hasi", "ladai-sulah"]},
    {"key": "bhai-behen.raaz", "prompt": "Koi raaz jo aap bhai-behenon ne milke {{nanaji}}-{{naniji}} se chhupaya tha?", "sub": "Ab toh bata sakti hain!", "emotions": ["hasi"]},
    {"key": "bhai-behen.ek-saath-photo", "prompt": "Ye photo dekhiye. Ye kab ki hai, aur us din kya hua tha?", "emotions": ["yaadein", "kami"],"weight": "medium", "photo": "P-Q-SIBLINGS-GROUP"},
  ],
  "jiji": [
    {"key": "jiji.choti-banana", "prompt": "{{addressWord}}, bachpan mein aapki choti kaun banati thi? {{jiji_badi}} ya {{jiji_chhoti}}?", "sub": "Aur kaun zor se khinchti thi?", "emotions": ["pyaar", "hasi"]},
    {"key": "jiji.kapde-chappal", "prompt": "Jijiyon ke kapde, chappal, chudiyan… chupke se pehne kabhi? Pakdi gayi thi?", "emotions": ["hasi"]},
    {"key": "jiji.badi-jiji-kaisi", "prompt": "{{jiji_badi}} kaisi thi? Unki koi aadat jo aap mein bhi aa gayi?", "emotions": ["pyaar", "yaadein"],"weight": "medium", "photo": "P-Q-JIJI-BADI"},
    {"key": "jiji.chhoti-jiji-kaisi", "prompt": "{{jiji_chhoti}} ke saath aapki jodi kaisi thi? Saheli jaisi ya didi jaisi?", "emotions": ["pyaar", "yaadein"],"weight": "medium", "photo": "P-Q-JIJI-CHHOTI"},
    {"key": "jiji.badi-jiji-shaadi", "prompt": "{{jiji_badi}} ki shaadi aapko yaad hai? Aapne kya pehna tha, kya kiya tha, kis gaane pe naachi thi?", "emotions": ["khushi", "yaadein"]},
    {"key": "jiji.ghar-khali", "prompt": "Jab Jijiyon ki shaadi ho gayi, ghar kaisa lagne laga? Aapki zimmedariyan badh gayi thi kya?", "emotions": ["kami", "himmat"],"weight": "medium"},
    {"key": "jiji.chitthi", "prompt": "Shaadi ke baad Jijiyon se baat kaise hoti thi? Chitthi, phone, ya milne jaana?", "emotions": ["kami", "pyaar"],"weight": "medium"},
    {"key": "jiji.unki-salah", "prompt": "Aapki shaadi ke time Jijiyon ne aapko kya samjhaya tha?", "emotions": ["seekh", "pyaar"],"weight": "medium"},
  ],
  "bhaiya-log": [
    {"key": "bhaiya-log.bade-shararat", "prompt": "{{bhaiya_bade}} ke saath bachpan ki koi shararat jo yaad karke aaj bhi hasi aati hai?", "emotions": ["hasi", "pyaar"],"photo": "P-Q-BADE-MAMAJI"},
    {"key": "bhaiya-log.bade-rakhwala", "prompt": "{{bhaiya_bade}} sabse bade the. Kya wo aapke liye doosre {{nanaji}} jaise the? Unse darr lagta tha ya pyaar?", "emotions": ["pyaar", "yaadein"]},
    {"key": "bhaiya-log.bade-scooter", "prompt": "{{bhaiya_bade}} kabhi aapko cycle ya scooter pe ghumane le jaate the? Kahan?", "emotions": ["khushi", "yaadein"]},
    {"key": "bhaiya-log.sanjhle-ladai", "prompt": "{{bhaiya_sanjhle}} se sabse zyada ladai kis baat pe hoti thi? Remote, radio, ya khaana?", "emotions": ["ladai-sulah", "hasi"],"photo": "P-Q-SANJHLE-MAMAJI"},
    {"key": "bhaiya-log.sanjhle-saathi", "prompt": "{{bhaiya_sanjhle}} aur aap milke kya kya karte the jo baaki kisi ko pata nahi tha?", "emotions": ["hasi", "pyaar"]},
    {"key": "bhaiya-log.manjhle-hasi", "prompt": "{{bhaiya_manjhle}} kaise the bachpan mein? Unki koi mazedaar baat?", "sub": "Bas ek chhoti si yaad bhi chalegi.", "emotions": ["hasi", "kami"],"weight": "medium"},
    {"key": "bhaiya-log.chhote-god", "prompt": "{{bhai_chhote}} sabse chhote the. Aapne unhe god mein khilaya tha? Wo aapke peeche peeche ghoomte the?", "emotions": ["pyaar", "kami"],"weight": "medium"},
    {"key": "bhaiya-log.bhabhi-aayi", "prompt": "Jab {{bhaiya_bade}} ki shaadi hui aur {{bhaiya_bade.spouse}} ghar aayi, aapko kaisa laga? Unse dosti kaise hui?", "emotions": ["khushi", "yaadein"]},
    {"key": "bhaiya-log.bhaiyon-ne-kya-kiya", "prompt": "Aapki shaadi mein bhaiyon ne kya kya kiya tha? Koi bhai roya tha?", "emotions": ["pyaar", "kami"],"weight": "medium"},
    {"key": "bhaiya-log.aaj-bhi", "prompt": "Aaj bhi {{bhaiya_bade}} aur {{bhaiya_sanjhle}} se baat hoti hai toh kya baatein hoti hain?", "emotions": ["pyaar"]},
  ],
  "school": [
    {"key": "school.kaunsa", "prompt": "{{addressWord}}, aap kaunse school mein padhi? School tak kaise jaati thi?", "sub": "Paidal, rickshaw, DTC bus…?", "emotions": ["yaadein"],"photo": "P-Q-SCHOOL"},
    {"key": "school.kaisi-student", "prompt": "School mein aap kaisi student thi? Sach batana!", "emotions": ["hasi"]},
    {"key": "school.favourite-teacher", "prompt": "Koi teacher jo aaj bhi yaad hain? Kyun?", "emotions": ["yaadein", "shukriya"]},
    {"key": "school.saheli", "prompt": "Aapki sabse pakki saheli kaun thi? Dono milke kya karti thi?", "followups": ["Aaj bhi unse baat hoti hai?"],"emotions": ["khushi", "hasi"]},
    {"key": "school.tiffin", "prompt": "Tiffin mein kya le jaati thi? Kiska tiffin chura ke khaati thi?", "emotions": ["hasi", "yaadein"]},
    {"key": "school.pakdi-gayi", "prompt": "Kabhi school ya ghar mein koi shararat karte hue pakdi gayi ho?", "emotions": ["hasi"]},
    {"key": "school.result", "prompt": "Result wala din kaisa hota tha ghar mein? {{nanaji}} kya kehte the?", "emotions": ["yaadein", "hasi"]},
  ],
  "jawani": [
    {"key": "jawani.gaana", "prompt": "Koi gaana jo sunte hi aap solah saal ki ho jaati ho?", "sub": "Gungunao bhi toh chalega.", "emotions": ["khushi", "yaadein"]},
    {"key": "jawani.cinema", "prompt": "Pehli baar cinema hall mein kaunsi film dekhi thi? Kiske saath, aur ghar pe pata chala tha?", "emotions": ["khushi", "hasi"]},
    {"key": "jawani.hero", "prompt": "Aapka favourite hero aur heroine kaun the? Unki kaunsi film baar baar dekhi?", "emotions": ["khushi", "hasi"]},
    {"key": "jawani.fashion", "prompt": "Us zamane mein aapka fashion kya tha? Koi suit ya saree jo aapko bahut pasand tha?", "emotions": ["khushi", "yaadein"],"photo": "P-Q-JAWANI"},
    {"key": "jawani.sapna", "prompt": "Badi hokar aap kya banna chahti thi, {{addressWord}}?", "followups": ["Wo sapna kahan gaya?"],"emotions": ["sapne"],"weight": "medium"},
    {"key": "jawani.shopping", "prompt": "Shopping karne kahan jaati thi? Kamla Nagar, Karol Bagh, Lajpat Nagar, Sarojini…?", "emotions": ["khushi", "yaadein"]},
    {"key": "jawani.azaadi", "prompt": "Kya ghar mein ladkiyon ke liye zyada rok-tok thi? Aapne kabhi koi niyam toda?", "emotions": ["himmat", "hasi"],"weight": "medium"},
  ],
  "rishta-shaadi": [
    {"key": "rishta.pehli-baar-suna", "prompt": "{{addressWord}}, {{papaji}} ke baare mein pehli baar kab suna tha? Kisne bataya?", "emotions": ["yaadein", "hasi"]},
    {"key": "rishta.pehli-mulaqat", "prompt": "{{papaji}} se pehli baar kab mili thi? Pehli nazar mein kya laga?", "sub": "Sach batana, {{papaji}} nahi sun rahe.", "emotions": ["pyaar", "hasi"]},
    {"key": "rishta.papaji-ka-sawaal", "prompt": "Mujhe pehli baar dekh ke aapne kya socha tha? Sach sach.", "emotions": ["pyaar", "hasi"],"askedBy": ["papaji"]},
    {"key": "rishta.marzi", "prompt": "Rishta kaise pakka hua? Aapki kya marzi thi, aur ghar mein kisne kya kaha?", "emotions": ["yaadein"],"weight": "medium", "tags": ["marriage"]},
    {"key": "rishta.bhaiyon-ki-jaanch", "prompt": "Bhaiyon ne {{papaji}} ki 'jaanch' kaise ki thi? Kisi ne koi sawaal poochha tha?", "emotions": ["hasi", "pyaar"]},
    {"key": "rishta.shaadi-ka-din", "prompt": "Shaadi wala din kaisa tha? Aapka joda kaisa tha, mehendi kaisi rachi thi?", "emotions": ["khushi", "yaadein"],"photo": "P-Q-SHAADI"},
    {"key": "rishta.shaadi-ka-kissa", "prompt": "Shaadi mein koi mazedaar kissa hua tha? Joote churai mein kitne paise mile?", "emotions": ["hasi", "khushi"]},
    {"key": "rishta.bidaai", "prompt": "Bidaai wala din kaisa tha, {{addressWord}}?", "sub": "Jitna mann ho utna hi batana.", "emotions": ["kami", "pyaar"],"weight": "heavy", "tags": ["marriage"]},
    {"key": "rishta.mayke-ki-yaad", "prompt": "Shaadi ke baad mayke ki sabse zyada yaad kis cheez ki aati thi?", "emotions": ["kami", "yaadein"],"weight": "medium"},
  ],
  "sasural": [
    {"key": "sasural.pehla-din", "prompt": "Sasural mein pehla din kaisa laga? Kisne sabse pehle apnapan dikhaya?", "emotions": ["yaadein", "shukriya"],"weight": "medium", "tags": ["inlaws"]},
    {"key": "sasural.pehli-rasoi", "prompt": "Sasural mein pehli baar kya banaya tha? Sabne kya kaha?", "emotions": ["hasi", "yaadein"]},
    {"key": "sasural.naye-niyam", "prompt": "Sasural ke kaunse tareeke aapke mayke se bilkul alag the?", "emotions": ["hasi", "yaadein"],"tags": ["inlaws"]},
    {"key": "sasural.pehli-karva-chauth", "prompt": "Pehla Karva Chauth kaisa tha? Chaand kitni der se nikla tha?", "emotions": ["pyaar", "hasi"]},
    {"key": "sasural.ghar-banaya", "prompt": "Kab laga ki ye ghar ab aapka apna ghar hai?", "emotions": ["pyaar", "himmat"],"weight": "medium"},
    {"key": "sasural.mayke-jaana", "prompt": "Shaadi ke baad pehli baar mayke gayi, tab bhai-behenon ne kaise swagat kiya?", "emotions": ["pyaar", "khushi"]},
  ],
  "papaji-aur-aap": [
    {"key": "papaji.choti-aadat", "prompt": "{{papaji}} ki koi choti si aadat jispe aapko aaj bhi pyaar aata hai?", "emotions": ["pyaar"]},
    {"key": "papaji.chidhaane-wali-aadat", "prompt": "Aur {{papaji}} ki kaunsi aadat se aaj bhi gussa aata hai? Ye bhi batao!", "emotions": ["hasi", "ladai-sulah"]},
    {"key": "papaji.ladai-sulah", "prompt": "Aap dono ki sabse mazedaar ladai kis baat pe hui thi? Aur sulah kisne ki?", "emotions": ["ladai-sulah", "hasi"]},
    {"key": "papaji.pehli-trip", "prompt": "{{papaji}} ke saath pehli baar kahan ghoomne gayi thi?", "emotions": ["khushi", "pyaar"],"photo": "P-Q-PAPAJI-TRIP"},
    {"key": "papaji.papaji-ka-sawaal-2", "prompt": "Itne saalon mein maine aapke liye sabse achha kya kiya? Aur kya nahi kar paya?", "emotions": ["pyaar", "shukriya"],"weight": "medium", "askedBy": ["papaji"]},
    {"key": "papaji.mushkil-mein-saath", "prompt": "Kabhi koi mushkil waqt jab {{papaji}} ne aapka saath diya, ya aapne unka?", "emotions": ["himmat", "pyaar"],"weight": "medium"},
    {"key": "papaji.jodi-ka-raaz", "prompt": "Itne saal saath rehne ka raaz kya hai, {{addressWord}}?", "emotions": ["seekh", "pyaar"]},
  ],
  "sunny-aaya": [
    {"key": "sunny.pata-chala", "prompt": "{{addressWord}}, jab pata chala ki main aane wala hoon, aapne sabse pehle kise bataya?", "emotions": ["khushi", "pyaar"],"askedBy": ["sunny"]},
    {"key": "sunny.janam", "prompt": "Mere janam wala din… jo bhi yaad hai, sab batao.", "sub": "Kaunsa hospital, kaun saath tha, mausam kaisa tha…", "emotions": ["pyaar", "khushi"],"askedBy": ["sunny"],"photo": "P-Q-SUNNY-BABY"},
    {"key": "sunny.pehli-baar-god", "prompt": "Mujhe pehli baar god mein liya, tab kya socha tha?", "emotions": ["pyaar"],"askedBy": ["sunny"]},
    {"key": "sunny.naam", "prompt": "Mera naam '{{sunny}}' kisne rakha? Aur asli naam kaise chuna?", "emotions": ["yaadein", "hasi"],"askedBy": ["sunny"]},
    {"key": "sunny.mama-log", "prompt": "Mamaji log aur Mausiji log mujhe pehli baar dekhne aaye toh kya laaye, kya bole?", "emotions": ["pyaar", "yaadein"],"askedBy": ["sunny"]},
    {"key": "sunny.pareshan", "prompt": "Bachpan mein maine aapko sabse zyada kab pareshan kiya? Sach batao, main sun sakta hoon.", "emotions": ["hasi", "ladai-sulah"],"askedBy": ["sunny"]},
    {"key": "sunny.pehla-din-school", "prompt": "Mera school ka pehla din yaad hai? Kaun zyada roya tha, main ya aap?", "emotions": ["hasi", "pyaar"],"askedBy": ["sunny"]},
    {"key": "sunny.garv", "prompt": "Kab mujh pe sabse zyada garv hua, par aapne kabhi bataya nahi?", "emotions": ["garv", "pyaar"],"weight": "medium", "askedBy": ["sunny"]},
  ],
  "mickey-aaya": [
    {"key": "mickey.pata-chala", "prompt": "{{addressWord}}, jab pata chala ki ghar mein ek aur bachcha aane wala hai, {{sunny}} ka kya reaction tha?", "emotions": ["hasi", "khushi"],"askedBy": ["mickey"]},
    {"key": "mickey.janam", "prompt": "Mere janam wala din… jo bhi yaad hai, sab batao.", "sub": "Kaun saath tha, {{sunny}} kahan tha, kaisa laga…", "emotions": ["pyaar", "khushi"],"askedBy": ["mickey"],"photo": "P-Q-MICKEY-BABY"},
    {"key": "mickey.naam", "prompt": "Mera naam '{{mickey}}' kaise pada? Ye kiska idea tha?", "emotions": ["hasi", "yaadein"],"askedBy": ["mickey"]},
    {"key": "mickey.pehli-baar-god", "prompt": "Mujhe pehli baar god mein lene pe kya mehsoos hua? Doosri baar {{addressWord}} banna alag tha?", "emotions": ["pyaar"],"askedBy": ["mickey"]},
    {"key": "mickey.shararat", "prompt": "Meri sabse badi shararat kaunsi thi jo aapne {{papaji}} se chhupa li?", "emotions": ["hasi"],"askedBy": ["mickey"]},
    {"key": "mickey.dono-ki-ladai", "prompt": "{{sunny}} aur meri ladai mein aap kiski side leti thi? Ab toh sach bata do!", "emotions": ["hasi", "ladai-sulah"],"askedBy": ["mickey", "sunny"]},
    {"key": "mickey.garv", "prompt": "Kab mujh pe sabse zyada garv hua, par aapne kabhi kaha nahi?", "emotions": ["garv", "pyaar"],"weight": "medium", "askedBy": ["mickey"]},
  ],
  "maa-banna": [
    {"key": "maa-banna.darr", "prompt": "Maa bante waqt sabse zyada darr kis baat ka lagta tha?", "emotions": ["himmat"],"weight": "medium"},
    {"key": "maa-banna.naniji-ki-seekh", "prompt": "{{naniji}} ne aapko Maa banne ke baare mein kya sikhaya tha?", "emotions": ["seekh", "pyaar"]},
    {"key": "maa-banna.lori", "prompt": "Humein sulane ke liye kaunsi lori ya kahani sunati thi? Ek baar phir suna do.", "sub": "Bol ke hi sunana, {{addressWord}}.", "emotions": ["pyaar", "yaadein"]},
    {"key": "maa-banna.bimari", "prompt": "Hum mein se koi bimaar padta tha toh aapki raatein kaisi hoti thi?", "emotions": ["himmat", "pyaar"],"weight": "medium"},
    {"key": "maa-banna.dono-alag", "prompt": "{{sunny}} aur {{mickey}} mein sabse bada fark kya tha bachpan mein?", "emotions": ["hasi", "pyaar"]},
    {"key": "maa-banna.chupke-garv", "prompt": "Kabhi chupke se hum dono pe garv hua ho, par kabhi bataya na ho?", "emotions": ["garv", "pyaar"],"weight": "medium", "askedBy": ["sunny", "mickey"]},
    {"key": "maa-banna.jo-chhoda", "prompt": "Humare liye aapne kya chhoda jo shayad humne kabhi notice hi nahi kiya?", "emotions": ["pyaar", "kami"],"weight": "heavy", "askedBy": ["sunny", "mickey"]},
    {"key": "maa-banna.apne-liye-waqt", "prompt": "Hum chhote the tab aap apne liye waqt kab nikaalti thi? Nikaalti bhi thi?", "emotions": ["himmat", "hasi"]},
  ],
  "beech-ke-saal": [
    {"key": "beech.ghar-chalana", "prompt": "Ghar kaise chalaya jaata hai, iska asli raaz kya hai, {{addressWord}}?", "emotions": ["seekh", "hasi"]},
    {"key": "beech.bachat", "prompt": "Kabhi chupke se paise bacha ke rakhe the? Kis cheez ke liye?", "sub": "Atte ke dabbe wale paise bhi count honge!", "emotions": ["hasi", "himmat"]},
    {"key": "beech.himmat", "prompt": "Kab aap itni himmat wali bani jitna kisi ko pata bhi nahi chala?", "emotions": ["himmat"],"weight": "heavy"},
    {"key": "beech.sabse-khushi-ka-saal", "prompt": "Shaadi ke baad ka sabse khushi wala saal kaunsa tha? Kyun?", "emotions": ["khushi"]},
    {"key": "beech.naya-sikha", "prompt": "Bachche bade ho gaye toh aapne apne liye kya naya seekha ya shuru kiya?", "emotions": ["sapne", "garv"]},
    {"key": "beech.mushkil-faisla", "prompt": "Koi mushkil faisla jo aapne liya, aur aaj lagta hai sahi tha?", "emotions": ["himmat", "seekh"],"weight": "medium"},
    {"key": "beech.ghar-khali", "prompt": "Jab hum padhai ya kaam ke liye bahar gaye, ghar kaisa lagne laga?", "emotions": ["kami", "pyaar"],"weight": "medium", "askedBy": ["sunny", "mickey"]},
  ],
  "gunjan-naye-rishte": [
    {"key": "gunjan.pehli-baar", "prompt": "{{askerAddress}}, mujhe pehli baar dekh ke aapne kya socha tha? Sach sach batana.", "emotions": ["pyaar", "hasi"],"askedBy": ["gunjan"],"photo": "P-Q-GUNJAN-FIRST"},
    {"key": "gunjan.sunny-ne-bataya", "prompt": "{{sunny}} ne aapko mere baare mein sabse pehle kya bataya tha?", "emotions": ["hasi", "pyaar"],"askedBy": ["gunjan"]},
    {"key": "gunjan.sunny-ki-shaadi", "prompt": "{{addressWord}}, meri shaadi wale din aapko kaisa lag raha tha? Aapki shaadi yaad aayi?", "emotions": ["pyaar", "khushi"],"askedBy": ["sunny"],"photo": "P-Q-SUNNY-WEDDING"},
    {"key": "gunjan.saas-banna", "prompt": "Saas banne pe kya socha tha? Apni saas jaisi banna hai ya bilkul alag?", "emotions": ["hasi", "seekh"],"weight": "medium", "tags": ["inlaws"]},
    {"key": "gunjan.sunny-ka-raaz", "prompt": "{{askerAddress}}, {{sunny}} ki koi bachpan ki baat batao jo usne mujhe kabhi nahi batayi!", "emotions": ["hasi"],"askedBy": ["gunjan"]},
    {"key": "gunjan.recipe", "prompt": "{{askerAddress}}, aapki kaunsi recipe aap mujhe sabse pehle sikhana chahengi? Abhi bata do, step by step.", "emotions": ["pyaar", "seekh"],"askedBy": ["gunjan"]},
    {"key": "gunjan.ummeed", "prompt": "{{gunjan}} aur {{sunny}} ke liye aapki sabse badi dua kya hai?", "emotions": ["pyaar"],"weight": "medium"},
    {"key": "gunjan.nani-dadi", "prompt": "Jab aap Dadi ya Nani banengi, toh kaisi Dadi-Nani banna chahengi?", "emotions": ["sapne", "hasi"]},
  ],
  "yaadon-mein": [
    {"key": "yaadon.jiji_badi.hasi", "prompt": "{{jiji_badi}} ki koi baat jo yaad karke aaj bhi hasi aa jaati hai?", "sub": "Unki koi aadat, koi dialogue, koi shararat…", "emotions": ["hasi", "kami"],"weight": "heavy", "tags": ["death"],"photo": "P-Q-JIJI-BADI"},
    {"key": "yaadon.jiji_badi.sikhaya", "prompt": "{{jiji_badi}} ne aapko kya sikhaya jo aap aaj bhi karti ho?", "emotions": ["seekh", "kami"],"weight": "heavy", "tags": ["death"]},
    {"key": "yaadon.jiji_badi.kehna", "prompt": "Agar aaj {{jiji_badi}} se ek baat keh paati, toh kya kehti?", "emotions": ["kami", "pyaar"],"weight": "heavy", "sealedDefault": true,"tags": ["death"]},
    {"key": "yaadon.jiji_chhoti.hasi", "prompt": "{{jiji_chhoti}} ki koi baat jo yaad karke aaj bhi hasi aa jaati hai?", "emotions": ["hasi", "kami"],"weight": "heavy", "tags": ["death"],"photo": "P-Q-JIJI-CHHOTI"},
    {"key": "yaadon.jiji_chhoti.saath", "prompt": "{{jiji_chhoti}} ke saath aakhri baar kab khul ke hasi thi? Kya baat thi?", "emotions": ["kami", "khushi"],"weight": "heavy", "tags": ["death"]},
    {"key": "yaadon.jiji_chhoti.kehna", "prompt": "Agar aaj {{jiji_chhoti}} se ek baat keh paati, toh kya kehti?", "emotions": ["kami", "pyaar"],"weight": "heavy", "sealedDefault": true,"tags": ["death"]},
    {"key": "yaadon.bhaiya_manjhle.hasi", "prompt": "{{bhaiya_manjhle}} ki koi baat jo yaad karke aaj bhi hasi aa jaati hai?", "emotions": ["hasi", "kami"],"weight": "heavy", "tags": ["death"],"photo": "P-Q-MANJHLE-MAMAJI"},
    {"key": "yaadon.bhaiya_manjhle.pasand", "prompt": "{{bhaiya_manjhle}} ko kya khana sabse pasand tha? Aap unke liye kya banati thi?", "emotions": ["pyaar", "kami"],"weight": "heavy", "tags": ["death"]},
    {"key": "yaadon.bhaiya_manjhle.kehna", "prompt": "Agar aaj {{bhaiya_manjhle}} se ek baat keh paati, toh kya kehti?", "emotions": ["kami", "pyaar"],"weight": "heavy", "sealedDefault": true,"tags": ["death"]},
    {"key": "yaadon.bhai_chhote.hasi", "prompt": "{{bhai_chhote}} ki koi baat jo yaad karke aaj bhi hasi aa jaati hai?", "emotions": ["hasi", "kami"],"weight": "heavy", "tags": ["death"],"photo": "P-Q-CHHOTE-MAMAJI"},
    {"key": "yaadon.bhai_chhote.rakhi", "prompt": "{{bhai_chhote}} ke saath ki koi Rakhi ya Bhai Dooj jo sabse zyada yaad hai?", "emotions": ["pyaar", "kami"],"weight": "heavy", "tags": ["death"]},
    {"key": "yaadon.bhai_chhote.kehna", "prompt": "Agar aaj {{bhai_chhote}} se ek baat keh paati, toh kya kehti?", "emotions": ["kami", "pyaar"],"weight": "heavy", "sealedDefault": true,"tags": ["death"]},
    {"key": "yaadon.sab-milke", "prompt": "Agar saaton bhai-behen ek din ke liye phir se {{hometown}} wale ghar ki chhat pe ikatthe ho jaayein, toh kya karenge?", "sub": "Ek sapna hi sahi, {{addressWord}}.", "emotions": ["kami", "khushi", "pyaar"],"weight": "heavy", "tags": ["death"]},
    {"key": "yaadon.kaise-yaad-karti", "prompt": "Aap unhe kaise yaad karti ho? Koi pooja, koi gaana, koi din?", "emotions": ["kami", "pyaar"],"weight": "heavy", "tags": ["death"]},
  ],
  "khushiyan": [
    {"key": "khushiyan.aam-sa-din", "prompt": "Ek bilkul aam sa din jo aaj bhi sabse khoobsurat lagta hai?", "emotions": ["khushi"]},
    {"key": "khushiyan.hasi", "prompt": "Kis baat pe aap itna hasti ho ki aansu aa jaate hain?", "emotions": ["hasi"]},
    {"key": "khushiyan.recipe", "prompt": "Aapki wo dish jo sirf aap hi sahi banati ho. Recipe batao, andaaze se nahi, sach mein!", "sub": "Bol ke batana best rahega. Hum likh lenge.", "emotions": ["pyaar", "hasi"]},
    {"key": "khushiyan.saree", "prompt": "Aapki sabse pasandeeda saree ya suit kaunsa hai? Uski kahani kya hai?", "emotions": ["khushi", "yaadein"]},
    {"key": "khushiyan.chai", "prompt": "Aapki perfect chai kaisi hoti hai, aur kiske saath peena sabse achha lagta hai?", "emotions": ["khushi", "pyaar"]},
    {"key": "khushiyan.gaana-aaj", "prompt": "Aajkal kaunsa gaana sun ke aapka mood achha ho jaata hai?", "emotions": ["khushi"]},
  ],
  "aaj-ki-mamma": [
    {"key": "aaj.subah", "prompt": "{{addressWord}}, aapki subah kaise shuru hoti hai? Pehla kaam kya hota hai?", "emotions": ["yaadein"]},
    {"key": "aaj.apna-din", "prompt": "Agar ek din sirf apne liye mile, koi zimmedari nahi, toh kya karogi?", "emotions": ["sapne", "khushi"]},
    {"key": "aaj.ghoomna", "prompt": "Ek jagah jahan aap abhi bhi jaana chahti ho? Hum le chalenge.", "emotions": ["sapne"]},
    {"key": "aaj.seekhna", "prompt": "Kuch naya jo aap abhi seekhna chahti ho?", "emotions": ["sapne"]},
    {"key": "aaj.humse-shikayat", "prompt": "Humse koi ek shikayat? Aaj sab maaf hai, khul ke bolo.", "emotions": ["hasi", "ladai-sulah"],"askedBy": ["sunny", "mickey", "gunjan"]},
    {"key": "aaj.khush-kya-karta", "prompt": "Hum aisa kya karein jisse aapko sabse zyada khushi milti hai?", "emotions": ["pyaar"],"askedBy": ["sunny", "mickey", "gunjan"]},
  ],
  "seekh": [
    {"key": "seekh.bees-saal", "prompt": "Bees saal ki apne aap ko ek baat kehni ho, toh kya kahogi?", "emotions": ["seekh"],"weight": "medium"},
    {"key": "seekh.zaroori", "prompt": "Pehle jo cheezein bahut zaroori lagti thi, ab nahi lagti. Kaunsi? Aur ab kya zaroori lagta hai?", "emotions": ["seekh"],"weight": "medium"},
    {"key": "seekh.rishte", "prompt": "Itne bade parivaar mein rishte nibhane ka raaz kya hai?", "emotions": ["seekh", "pyaar"]},
    {"key": "seekh.gussa", "prompt": "Gussa aaye toh aap kya karti ho? Humein bhi sikha do.", "emotions": ["seekh", "hasi"]},
    {"key": "seekh.kahawat", "prompt": "{{naniji}} ki ya aapki koi kahawat jo hamesha sahi nikli?", "emotions": ["seekh", "yaadein"]},
    {"key": "seekh.yaad-rakhein", "prompt": "Aap chahti ho log aapko kaise yaad rakhein?", "emotions": ["seekh", "pyaar"],"weight": "medium"},
  ],
  "chitthiyan": [
    {"key": "chitthi.sunny", "prompt": "{{sunny}} ke liye ek chitthi. Jo dil mein hai, bol do.", "emotions": ["pyaar"],"weight": "medium", "sealedDefault": true},
    {"key": "chitthi.mickey", "prompt": "{{mickey}} ke liye ek chitthi. Jo dil mein hai, bol do.", "emotions": ["pyaar"],"weight": "medium", "sealedDefault": true},
    {"key": "chitthi.gunjan", "prompt": "{{gunjan}} ke liye ek chitthi, apni bahu ke liye.", "emotions": ["pyaar"],"weight": "medium", "sealedDefault": true},
    {"key": "chitthi.papaji", "prompt": "{{papaji}} ke liye ek baat jo aap unse kabhi keh nahi paayi.", "emotions": ["pyaar"],"weight": "medium", "sealedDefault": true},
    {"key": "chitthi.bhaiyon-ke-liye", "prompt": "{{bhaiya_bade}} aur {{bhaiya_sanjhle}} ke liye ek chitthi. Unhe sunaayein?", "sub": "Aap chahein toh hum unhe bhej denge.", "emotions": ["pyaar", "kami"],"weight": "medium", "sealedDefault": true},
    {"key": "chitthi.pote-poti", "prompt": "Apne pote-potiyon ke liye… jo abhi aaye bhi nahi.", "emotions": ["pyaar", "seekh"],"weight": "medium", "sealedDefault": true},
    {"key": "chitthi.chhoti-mamma", "prompt": "{{hometown}} wale ghar ki chhat pe baithi us chhoti si bachchi ke liye ek chitthi.", "emotions": ["pyaar", "kami"],"weight": "medium"},
    {"key": "chitthi.raaz", "prompt": "Ek baat jo aapne aaj tak kisi ko nahi batayi.", "sub": "Ye band lifafe mein rahegi. Aap tay karengi kab khule.", "emotions": ["pyaar"],"weight": "medium", "sealedDefault": true},
    {"key": "chitthi.jo-poocha-nahi", "prompt": "Kuch aisa jo humne poochha hi nahi, par aap batana chahti ho?", "emotions": ["pyaar", "seekh"]},
  ],
};
