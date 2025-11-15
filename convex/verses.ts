import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Seed the verse database (run this once to populate)
export const seedVerses = mutation({
  args: {},
  handler: async (ctx) => {
    const verses = [
      // ANXIETY & FEAR
      {
        reference: "Philippians 4:6-7",
        text: "Be anxious for nothing, but in everything by prayer and supplication, with thanksgiving, let your requests be made known to God; and the peace of God, which surpasses all understanding, will guard your hearts and minds through Christ Jesus.",
        translation: "NKJV",
        categories: ["anxiety", "fear", "worry", "peace"],
        tags: ["prayer", "peace", "mental-health"],
      },
      {
        reference: "Psalm 23:4",
        text: "Yea, though I walk through the valley of the shadow of death, I will fear no evil; For You are with me; Your rod and Your staff, they comfort me.",
        translation: "NKJV",
        categories: ["fear", "anxiety", "comfort", "protection"],
        tags: ["comfort", "presence-of-god"],
      },
      {
        reference: "Isaiah 41:10",
        text: "Fear not, for I am with you; Be not dismayed, for I am your God. I will strengthen you, Yes, I will help you, I will uphold you with My righteous right hand.",
        translation: "NKJV",
        categories: ["fear", "anxiety", "strength", "courage"],
        tags: ["strength", "courage", "presence-of-god"],
      },
      {
        reference: "Matthew 6:34",
        text: "Therefore do not worry about tomorrow, for tomorrow will worry about its own things. Sufficient for the day is its own trouble.",
        translation: "NKJV",
        categories: ["worry", "anxiety", "peace"],
        tags: ["peace", "trust"],
      },
      {
        reference: "1 Peter 5:7",
        text: "Casting all your care upon Him, for He cares for you.",
        translation: "NKJV",
        categories: ["anxiety", "worry", "care"],
        tags: ["trust", "care"],
      },

      // TEMPTATION & SIN
      {
        reference: "1 Corinthians 10:13",
        text: "No temptation has overtaken you except such as is common to man; but God is faithful, who will not allow you to be tempted beyond what you are able, but with the temptation will also make the way of escape, that you may be able to bear it.",
        translation: "NKJV",
        categories: ["temptation", "sin", "strength", "escape"],
        tags: ["temptation", "victory", "faithfulness"],
      },
      {
        reference: "James 4:7",
        text: "Therefore submit to God. Resist the devil and he will flee from you.",
        translation: "NKJV",
        categories: ["temptation", "sin", "spiritual-warfare"],
        tags: ["victory", "resistance", "spiritual-warfare"],
      },
      {
        reference: "Psalm 119:9-11",
        text: "How can a young man cleanse his way? By taking heed according to Your word. With my whole heart I have sought You; Oh, let me not wander from Your commandments! Your word I have hidden in my heart, That I might not sin against You.",
        translation: "NKJV",
        categories: ["sin", "temptation", "purity", "scripture"],
        tags: ["purity", "scripture", "obedience"],
      },
      {
        reference: "Romans 6:14",
        text: "For sin shall not have dominion over you, for you are not under law but under grace.",
        translation: "NKJV",
        categories: ["sin", "freedom", "grace"],
        tags: ["freedom", "grace", "victory"],
      },
      {
        reference: "Hebrews 4:15-16",
        text: "For we do not have a High Priest who cannot sympathize with our weaknesses, but was in all points tempted as we are, yet without sin. Let us therefore come boldly to the throne of grace, that we may obtain mercy and find grace to help in time of need.",
        translation: "NKJV",
        categories: ["temptation", "sin", "grace", "mercy"],
        tags: ["grace", "mercy", "jesus"],
      },

      // DEPRESSION & SADNESS
      {
        reference: "Psalm 34:18",
        text: "The LORD is near to those who have a broken heart, And saves such as have a contrite spirit.",
        translation: "NKJV",
        categories: ["depression", "sadness", "brokenness", "comfort"],
        tags: ["comfort", "presence-of-god", "healing"],
      },
      {
        reference: "Psalm 42:11",
        text: "Why are you cast down, O my soul? And why are you disquieted within me? Hope in God; For I shall yet praise Him, The help of my countenance and my God.",
        translation: "NKJV",
        categories: ["depression", "sadness", "hope"],
        tags: ["hope", "praise", "healing"],
      },
      {
        reference: "Isaiah 61:3",
        text: "To console those who mourn in Zion, To give them beauty for ashes, The oil of joy for mourning, The garment of praise for the spirit of heaviness.",
        translation: "NKJV",
        categories: ["sadness", "depression", "joy", "comfort"],
        tags: ["joy", "comfort", "restoration"],
      },

      // LONELINESS & ISOLATION
      {
        reference: "Deuteronomy 31:6",
        text: "Be strong and of good courage, do not fear nor be afraid of them; for the LORD your God, He is the One who goes with you. He will not leave you nor forsake you.",
        translation: "NKJV",
        categories: ["loneliness", "fear", "courage"],
        tags: ["presence-of-god", "courage", "faithfulness"],
      },
      {
        reference: "Psalm 68:6",
        text: "God sets the solitary in families; He brings out those who are bound into prosperity.",
        translation: "NKJV",
        categories: ["loneliness", "community"],
        tags: ["community", "family", "provision"],
      },

      // ANGER & FRUSTRATION
      {
        reference: "Ephesians 4:26-27",
        text: "Be angry, and do not sin: do not let the sun go down on your wrath, nor give place to the devil.",
        translation: "NKJV",
        categories: ["anger", "self-control"],
        tags: ["self-control", "wisdom"],
      },
      {
        reference: "James 1:19-20",
        text: "So then, my beloved brethren, let every man be swift to hear, slow to speak, slow to wrath; for the wrath of man does not produce the righteousness of God.",
        translation: "NKJV",
        categories: ["anger", "self-control", "patience"],
        tags: ["self-control", "patience", "wisdom"],
      },

      // PRIDE & HUMILITY
      {
        reference: "Proverbs 16:18",
        text: "Pride goes before destruction, And a haughty spirit before a fall.",
        translation: "NKJV",
        categories: ["pride", "humility"],
        tags: ["humility", "wisdom"],
      },
      {
        reference: "James 4:10",
        text: "Humble yourselves in the sight of the Lord, and He will lift you up.",
        translation: "NKJV",
        categories: ["humility", "pride"],
        tags: ["humility", "submission"],
      },

      // DOUBT & FAITH
      {
        reference: "Mark 9:24",
        text: "Immediately the father of the child cried out and said with tears, 'Lord, I believe; help my unbelief!'",
        translation: "NKJV",
        categories: ["doubt", "faith", "prayer"],
        tags: ["faith", "prayer", "honesty"],
      },
      {
        reference: "Hebrews 11:1",
        text: "Now faith is the substance of things hoped for, the evidence of things not seen.",
        translation: "NKJV",
        categories: ["faith", "hope"],
        tags: ["faith", "hope"],
      },
      {
        reference: "Romans 10:17",
        text: "So then faith comes by hearing, and hearing by the word of God.",
        translation: "NKJV",
        categories: ["faith", "scripture"],
        tags: ["faith", "scripture", "growth"],
      },

      // GOALS: PRAYER & DEVOTION
      {
        reference: "1 Thessalonians 5:16-18",
        text: "Rejoice always, pray without ceasing, in everything give thanks; for this is the will of God in Christ Jesus for you.",
        translation: "NKJV",
        categories: ["prayer", "thanksgiving", "joy"],
        tags: ["prayer", "joy", "thanksgiving"],
      },
      {
        reference: "Matthew 6:6",
        text: "But you, when you pray, go into your room, and when you have shut your door, pray to your Father who is in the secret place; and your Father who sees in secret will reward you openly.",
        translation: "NKJV",
        categories: ["prayer", "intimacy"],
        tags: ["prayer", "intimacy", "discipline"],
      },
      {
        reference: "Philippians 4:6",
        text: "Be anxious for nothing, but in everything by prayer and supplication, with thanksgiving, let your requests be made known to God.",
        translation: "NKJV",
        categories: ["prayer", "anxiety", "peace"],
        tags: ["prayer", "peace", "trust"],
      },

      // GOALS: BIBLE STUDY & SCRIPTURE
      {
        reference: "2 Timothy 3:16-17",
        text: "All Scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness, that the man of God may be complete, thoroughly equipped for every good work.",
        translation: "NKJV",
        categories: ["scripture", "growth", "wisdom"],
        tags: ["scripture", "growth", "training"],
      },
      {
        reference: "Joshua 1:8",
        text: "This Book of the Law shall not depart from your mouth, but you shall meditate in it day and night, that you may observe to do according to all that is written in it. For then you will make your way prosperous, and then you will have good success.",
        translation: "NKJV",
        categories: ["scripture", "meditation", "success"],
        tags: ["scripture", "meditation", "obedience"],
      },
      {
        reference: "Psalm 119:105",
        text: "Your word is a lamp to my feet And a light to my path.",
        translation: "NKJV",
        categories: ["scripture", "guidance"],
        tags: ["scripture", "guidance", "wisdom"],
      },

      // GOALS: EVANGELISM & WITNESSING
      {
        reference: "Matthew 28:19-20",
        text: "Go therefore and make disciples of all the nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit, teaching them to observe all things that I have commanded you; and lo, I am with you always, even to the end of the age.",
        translation: "NKJV",
        categories: ["evangelism", "discipleship", "mission"],
        tags: ["evangelism", "discipleship", "great-commission"],
      },
      {
        reference: "1 Peter 3:15",
        text: "But sanctify the Lord God in your hearts, and always be ready to give a defense to everyone who asks you a reason for the hope that is in you, with meekness and fear.",
        translation: "NKJV",
        categories: ["evangelism", "apologetics", "hope"],
        tags: ["evangelism", "apologetics", "witness"],
      },

      // GOALS: SERVICE & LOVE
      {
        reference: "Mark 10:45",
        text: "For even the Son of Man did not come to be served, but to serve, and to give His life a ransom for many.",
        translation: "NKJV",
        categories: ["service", "love", "sacrifice"],
        tags: ["service", "sacrifice", "jesus"],
      },
      {
        reference: "Galatians 5:13",
        text: "For you, brethren, have been called to liberty; only do not use liberty as an opportunity for the flesh, but through love serve one another.",
        translation: "NKJV",
        categories: ["service", "love", "freedom"],
        tags: ["service", "love", "freedom"],
      },

      // ENCOURAGEMENT & HOPE
      {
        reference: "Jeremiah 29:11",
        text: "For I know the thoughts that I think toward you, says the LORD, thoughts of peace and not of evil, to give you a future and a hope.",
        translation: "NKJV",
        categories: ["hope", "future", "peace"],
        tags: ["hope", "future", "plans"],
      },
      {
        reference: "Romans 8:28",
        text: "And we know that all things work together for good to those who love God, to those who are the called according to His purpose.",
        translation: "NKJV",
        categories: ["hope", "trust", "sovereignty"],
        tags: ["hope", "trust", "sovereignty"],
      },
      {
        reference: "Philippians 1:6",
        text: "Being confident of this very thing, that He who has begun a good work in you will complete it until the day of Jesus Christ.",
        translation: "NKJV",
        categories: ["hope", "perseverance", "growth"],
        tags: ["hope", "perseverance", "sanctification"],
      },

      // STRENGTH & COURAGE
      {
        reference: "Philippians 4:13",
        text: "I can do all things through Christ who strengthens me.",
        translation: "NKJV",
        categories: ["strength", "courage", "empowerment"],
        tags: ["strength", "empowerment", "christ"],
      },
      {
        reference: "Isaiah 40:31",
        text: "But those who wait on the LORD Shall renew their strength; They shall mount up with wings like eagles, They shall run and not be weary, They shall walk and not faint.",
        translation: "NKJV",
        categories: ["strength", "endurance", "waiting"],
        tags: ["strength", "endurance", "waiting"],
      },

      // LOVE OF GOD
      {
        reference: "Romans 8:38-39",
        text: "For I am persuaded that neither death nor life, nor angels nor principalities nor powers, nor things present nor things to come, nor height nor depth, nor any other created thing, shall be able to separate us from the love of God which is in Christ Jesus our Lord.",
        translation: "NKJV",
        categories: ["love", "security", "assurance"],
        tags: ["love", "security", "christ"],
      },
      {
        reference: "John 3:16",
        text: "For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life.",
        translation: "NKJV",
        categories: ["love", "salvation", "gospel"],
        tags: ["love", "gospel", "salvation"],
      },
    ];

    // Insert all verses
    for (const verse of verses) {
      await ctx.db.insert("verses", verse);
    }

    return { message: `Inserted ${verses.length} verses successfully` };
  },
});

// Get verses by categories (for matching to user struggles/goals)
export const getVersesByCategories = query({
  args: { categories: v.array(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const allVerses = await ctx.db.query("verses").collect();

    // Filter verses that match any of the provided categories
    const matchedVerses = allVerses.filter((verse) =>
      verse.categories.some((cat) => args.categories.includes(cat))
    );

    // Shuffle and limit
    const shuffled = matchedVerses.sort(() => Math.random() - 0.5);
    const limit = args.limit || 6;

    return shuffled.slice(0, limit);
  },
});

// Get all verses (for admin purposes)
export const getAllVerses = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("verses").collect();
  },
});
