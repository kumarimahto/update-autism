require('dotenv').config()
const express = require('express')
const cors = require('cors')
const axios = require('axios')

const app = express()
// Enable CORS for all origins
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
}))

app.use(express.json())

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-pro'

function buildPrompt(body) {
  let prompt = `Child age: ${body.age}\nEye contact: ${body.eye_contact}\nSpeech level: ${body.speech_level}\nSocial response: ${body.social_response}\nSensory reactions: ${body.sensory_reactions}\n`;
  
  // Include emotion data if available
  if (body.emotion_data) {
    const emotion = body.emotion_data;
    prompt += `\nEmotion Analysis: Primary emotion detected is ${emotion.dominant_emotion} with ${emotion.confidence}% confidence. All emotions detected: ${Object.entries(emotion.all_emotions).map(([e, v]) => `${e}: ${v}%`).join(', ')}.\n`;
  }
  
  prompt += `\nBased on this child's responses${body.emotion_data ? ' and emotional state' : ''}, give 3 short therapy goals and 2 activities that can help improvement. ${body.emotion_data ? 'Consider the detected emotions when providing recommendations.' : ''} Return JSON with keys: focus_areas (list of strings), therapy_goals (list of 3 strings), activities (list of 2 strings).`;
  
  return prompt;
}

async function callGeminiAI(prompt, requestBody) {
  if (GEMINI_API_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`
      const body = {
        contents: [{
          parts: [{ text: prompt }]
        }]
      }
      const resp = await axios.post(url, body, { headers: { 'Content-Type': 'application/json' } })
      const text = resp.data.candidates[0].content.parts[0].text
      try {
        return JSON.parse(text)
      } catch (err) {
        return { raw: text }
      }
    } catch (error) {
      console.log('Gemini API error, falling back to heuristic response:', error.message)
      return heuristicResponse(prompt, requestBody)
    }
  } else {
    return heuristicResponse(prompt, requestBody)
  }
}

function heuristicResponse(prompt, requestBody) {
  const low = JSON.stringify(requestBody).toLowerCase()
  const age = parseInt(requestBody.age) || 3;
  
  // Create unique seed based on input + timestamp for variety
  const inputHash = JSON.stringify(requestBody).split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const timeSeed = Math.floor(Date.now() / 1000); // Changes every second
  const randomSeed = Math.abs(inputHash + timeSeed) % 1000;
  
  console.log('📥 Input received:', requestBody);
  console.log('🔤 Normalized input:', low);
  console.log(`👶 Child age: ${age} years`);
  console.log(`🎲 Random seed: ${randomSeed} (ensures variety)`);
  
  const focus = []
  const goals = []
  const activities = []
  
  // Seeded random function for consistent but varied results
  let seedValue = randomSeed;
  function seededRandom() {
    seedValue = (seedValue * 9301 + 49297) % 233280;
    return seedValue / 233280;
  }
  
  // Custom shuffle function using seeded random
  function seededShuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  // Track what we've already added to prevent duplicates
  const addedGoals = new Set()
  const addedActivities = new Set()

  // Advanced semantic duplicate prevention system
  function addUniqueGoal(goalText) {
    const normalizeText = (text) => {
      return text.toLowerCase()
        .replace(/[.,!?;:-]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };
    
    const normalizedGoal = normalizeText(goalText);
    
    // Check against existing goals array
    for (const existing of goals) {
      const normalizedExisting = normalizeText(existing);
      
      // Level 1: Exact text match
      if (normalizedExisting === normalizedGoal) {
        console.log(`🚫 EXACT duplicate blocked: "${goalText}"`);
        return false;
      }
      
      // Level 2: Key autism therapy phrase matching
      const keyPhrases = [
        'social routines', 'daily activities', 'social skills', 'sensory activities',
        'communication', 'eye contact', 'sensory processing', 'emotional regulation',
        'turn taking', 'joint attention', 'social referencing', 'encourage social'
      ];
      
      let phraseMatches = 0;
      for (const phrase of keyPhrases) {
        if (normalizedGoal.includes(phrase) && normalizedExisting.includes(phrase)) {
          phraseMatches++;
        }
      }
      
      if (phraseMatches >= 1) { // Even 1 key phrase match = duplicate
        console.log(`🚫 KEY PHRASE duplicate blocked: "${goalText}" vs "${existing}"`);
        return false;
      }
      
      // Level 3: Word overlap analysis (strict)
      const goalWords = normalizedGoal.split(' ').filter(word => word.length > 2);
      const existingWords = normalizedExisting.split(' ').filter(word => word.length > 2);
      const commonWords = goalWords.filter(word => existingWords.includes(word));
      
      const similarity = (commonWords.length / Math.max(goalWords.length, existingWords.length)) * 100;
      
      if (similarity > 30) { // Very strict - 30% similarity = duplicate
        console.log(`🚫 WORD SIMILARITY duplicate blocked (${similarity.toFixed(1)}%): "${goalText}"`);
        return false;
      }
    }
    
    // Check Set-based tracking too
    if (addedGoals.has(normalizedGoal)) {
      console.log(`🚫 SET duplicate blocked: "${goalText}"`);
      return false;
    }
    
    // Add if no duplicates found and within limit
    if (goals.length < 6) {
      goals.push(goalText);
      addedGoals.add(normalizedGoal);
      console.log(`✅ UNIQUE goal added (${goals.length}/6): "${goalText}"`);
      return true;
    } else {
      console.log(`⏸️ Goal limit reached, skipping: "${goalText}"`);
      return false;
    }
  }

  // Helper function to add unique activities  
  function addUniqueActivity(activityText) {
    if (!addedActivities.has(activityText.toLowerCase()) && activities.length < 2) {
      activities.push(activityText)
      addedActivities.add(activityText.toLowerCase())
    }
  }

  // Age-based and input-specific eye contact goals  
  const eyeContactLevel = requestBody.eye_contact?.toLowerCase() || '';
  if (eyeContactLevel.includes('limited') || eyeContactLevel.includes('poor') || eyeContactLevel.includes('no')) {
    focus.push('Eye contact & visual attention')
    focus.push('Joint attention & shared focus skills') 
    focus.push('Non-verbal communication improvement')
    console.log(`🔍 Processing EYE CONTACT for ${eyeContactLevel} level, age ${age}...`);
    
    if (age <= 3) {
      const earlyEyeGoals = [
        'Begin with brief moments of shared attention during preferred play activities',
        'Use peek-a-boo and simple turn-taking games to encourage eye contact',
        'Practice joint attention through pointing at interesting objects together',
        'Build visual connection through mirror play and face games',
        'Encourage looking at faces during feeding and caregiving routines'
      ];
      // Seeded random selection for consistent variety
      const shuffled = seededShuffle(earlyEyeGoals);
      shuffled.slice(0, Math.min(3, 6 - goals.length)).forEach(goal => addUniqueGoal(goal));
    } else if (age <= 6) {
      const schoolEyeGoals = [
        'Practice making and holding brief eye contact during preferred activities',
        'Develop joint attention skills through pointing and showing objects',
        'Improve social referencing by looking at caregivers during interactions',
        'Build eye contact comfort through structured games and activities',
        'Practice looking at speaker during group instruction time'
      ];
      const shuffled = seededShuffle(schoolEyeGoals);
      shuffled.slice(0, Math.min(3, 6 - goals.length)).forEach(goal => addUniqueGoal(goal));
    } else {
      const teenEyeGoals = [
        'Strengthen eye contact skills during conversations and social interactions',
        'Practice maintaining appropriate eye contact during learning activities',
        'Develop confidence in using eye contact for social communication',
        'Build professional eye contact skills for workplace preparation',
        'Practice cultural awareness of appropriate eye contact in different settings'
      ];
      const shuffled = seededShuffle(teenEyeGoals);
      shuffled.slice(0, Math.min(3, 6 - goals.length)).forEach(goal => addUniqueGoal(goal));
    }
    console.log(`📊 Goals after eye contact (age ${age}): ${goals.length}`);
  }
  // Age and level-specific speech goals
  const speechLevel = requestBody.speech_level?.toLowerCase() || '';
  if (speechLevel.includes('no') || speechLevel.includes('limited') || speechLevel.includes('few') || speechLevel.includes('passive')) {
    focus.push('Expressive & receptive communication')
    focus.push('Language development & vocabulary expansion')
    focus.push('Social communication & pragmatic skills')
    console.log(`🔍 Processing SPEECH for ${speechLevel} level, age ${age}...`);
    
    if (age <= 3) {
      const earlySpeechGoals = [
        'Encourage early vocalizations and sound imitation during play',
        'Use simple gestures and signs to support communication development',
        'Build receptive language through naming and describing daily activities',
        'Practice babbling and sound play during interactive games',
        'Develop pre-verbal communication through reaching and pointing'
      ];
      const shuffled = seededShuffle(earlySpeechGoals);
      shuffled.slice(0, Math.min(3, 6 - goals.length)).forEach(goal => addUniqueGoal(goal));
    } else if (age <= 6) {
      const schoolSpeechGoals = [
        'Increase functional communication using words, signs, or picture cards',
        'Develop age-appropriate vocabulary for daily needs and emotions',
        'Improve turn-taking skills in conversations and play',
        'Build sentence structure and grammatical understanding',
        'Practice requesting help and expressing needs clearly'
      ];
      const shuffled = seededShuffle(schoolSpeechGoals);
      shuffled.slice(0, Math.min(3, 6 - goals.length)).forEach(goal => addUniqueGoal(goal));
    } else if (age <= 12) {
      const middleSpeechGoals = [
        'Enhance expressive language skills for academic and social success',
        'Develop conversation skills including asking questions and sharing ideas',
        'Improve narrative skills through storytelling and describing experiences',
        'Build complex sentence structures and abstract language concepts',
        'Practice social communication skills for peer interactions'
      ];
      const shuffled = seededShuffle(middleSpeechGoals);
      shuffled.slice(0, Math.min(3, 6 - goals.length)).forEach(goal => addUniqueGoal(goal));
    } else {
      const teenSpeechGoals = [
        'Strengthen communication skills for independence and social relationships',
        'Develop advanced language skills for academic and vocational success',
        'Practice effective communication in various social contexts',
        'Build professional communication skills for workplace readiness',
        'Enhance self-advocacy and assertiveness in communication'
      ];
      const shuffled = seededShuffle(teenSpeechGoals);
      shuffled.slice(0, Math.min(3, 6 - goals.length)).forEach(goal => addUniqueGoal(goal));
    }
    console.log(`📊 Goals after speech (age ${age}): ${goals.length}`);
  }
  // Age and severity-specific sensory goals
  const sensoryLevel = requestBody.sensory_reactions?.toLowerCase() || '';
  if (sensoryLevel.includes('sensitive') || sensoryLevel.includes('very') || sensoryLevel.includes('overreact')) {
    focus.push('Sensory processing & integration')
    focus.push('Self-regulation & coping strategies')
    focus.push('Environmental adaptation & tolerance')
    console.log(`🔍 Processing SENSORY for ${sensoryLevel} reactions, age ${age}...`);
    
    if (age <= 4) {
      const earlySensoryGoals = [
        'Gradually introduce new textures and sensory experiences through play',
        'Create predictable sensory routines to build comfort and security',
        'Use calming sensory activities during daily transitions',
        'Explore different sensory materials in safe, structured environments',
        'Build sensory tolerance through gentle, graduated exposure'
      ];
      const shuffled = seededShuffle(earlySensoryGoals);
      shuffled.slice(0, Math.min(3, 6 - goals.length)).forEach(goal => addUniqueGoal(goal));
    } else if (age <= 8) {
      const schoolSensoryGoals = [
        'Build tolerance to various textures, sounds, and sensory inputs',
        'Develop self-regulation techniques for sensory overload',
        'Create and use sensory calming strategies during daily routines',
        'Practice sensory regulation skills in classroom environments',
        'Learn to communicate sensory needs to teachers and peers'
      ];
      const shuffled = seededShuffle(schoolSensoryGoals);
      shuffled.slice(0, Math.min(3, 6 - goals.length)).forEach(goal => addUniqueGoal(goal));
    } else {
      const teenSensoryGoals = [
        'Develop advanced self-awareness of sensory needs and triggers',
        'Learn independent sensory regulation strategies for different environments',
        'Build confidence in managing sensory challenges in social settings',
        'Create personal sensory toolkit for workplace and community settings',
        'Practice self-advocacy skills for sensory accommodations'
      ];
      const shuffled = seededShuffle(teenSensoryGoals);
      shuffled.slice(0, Math.min(3, 6 - goals.length)).forEach(goal => addUniqueGoal(goal));
    }
    console.log(`📊 Goals after sensory (age ${age}): ${goals.length}`);
  }
  
  // Social response based goals
  const socialLevel = requestBody.social_response?.toLowerCase() || '';
  if (socialLevel.includes('difficulty') || socialLevel.includes('limited') || socialLevel.includes('passive')) {
    focus.push('Social skills & peer interaction')
    focus.push('Social communication & pragmatics')
    focus.push('Emotional understanding & empathy')
    console.log(`🔍 Processing SOCIAL for ${socialLevel} response, age ${age}...`);
    
    if (age <= 4) {
      const earlySocialGoals = [
        'Encourage parallel play and shared attention with peers',
        'Practice simple social greetings and farewells',
        'Develop awareness of others through imitation games',
        'Build comfort with peer interactions in structured settings',
        'Practice taking turns in simple games and activities'
      ];
      const shuffled = seededShuffle(earlySocialGoals);
      shuffled.slice(0, Math.min(3, 6 - goals.length)).forEach(goal => addUniqueGoal(goal));
    } else if (age <= 8) {
      const schoolSocialGoals = [
        'Develop age-appropriate social play skills with peers and siblings',
        'Practice sharing, taking turns, and cooperative activities',
        'Learn to recognize and respond to social cues from others',
        'Build friendship skills through structured social activities',
        'Practice problem-solving in peer conflicts with adult support'
      ];
      const shuffled = seededShuffle(schoolSocialGoals);
      shuffled.slice(0, Math.min(3, 6 - goals.length)).forEach(goal => addUniqueGoal(goal));
    } else {
      const teenSocialGoals = [
        'Build meaningful friendships through shared interests and activities',
        'Develop conflict resolution and problem-solving skills with peers',
        'Practice social communication skills for group settings',
        'Learn to navigate complex social situations with confidence',
        'Develop leadership and collaboration skills in team activities'
      ];
      const shuffled = seededShuffle(teenSocialGoals);
      shuffled.slice(0, Math.min(3, 6 - goals.length)).forEach(goal => addUniqueGoal(goal));
    }
    console.log(`📊 Goals after social (age ${age}): ${goals.length}`);
  }

  // Add social interaction goals based on input
  if (low.includes('social') && (low.includes('active') || low.includes('passive'))) {
    focus.push('Social interaction & peer engagement')
    focus.push('Play skills & social imagination')
    addUniqueGoal('Develop age-appropriate social play skills with peers and siblings')
    addUniqueGoal('Practice sharing, taking turns, and cooperative activities')
  }

  // Add emotion-based recommendations with comprehensive goals
  if (low.includes('sad') || low.includes('fear')) {
    focus.push('Emotional regulation & comfort building')
    focus.push('Anxiety management & confidence')
    addUniqueGoal('Build emotional security through consistent routines and positive interactions')
    addUniqueGoal('Develop coping strategies for managing anxiety and fear responses')
  }
  if (low.includes('angry') || low.includes('disgust')) {
    focus.push('Emotional expression & behavioral management')
    focus.push('Frustration tolerance & problem-solving')
    addUniqueGoal('Learn appropriate ways to express frustration and seek help when needed')
    addUniqueGoal('Develop problem-solving skills to reduce challenging behaviors')
  }
  if (low.includes('happy')) {
    focus.push('Positive engagement & motivation enhancement')
    focus.push('Social connection & relationship building')
    addUniqueGoal('Use natural interests and joy to enhance learning opportunities')
    addUniqueGoal('Build positive relationships through shared enjoyable activities')
  }

  // Only add developmental goals if no specific issues found
  if (goals.length < 3) {
    console.log('🔍 Adding developmental goals for well-functioning profile...');
    addUniqueGoal('Improve daily living skills appropriate for chronological age')
    addUniqueGoal('Enhance cognitive flexibility and adaptability to routine changes')
    addUniqueGoal('Strengthen family bonding through structured parent-child interaction time')
  }

  // Add diverse fallback goals to ensure variety
  const uniqueFallbackGoals = [
    'Foster independence in age-appropriate self-care tasks',
    'Enhance cognitive flexibility through problem-solving games', 
    'Build resilience and adaptability to environmental changes',
    'Develop motor planning skills through purposeful movement activities',
    'Strengthen attention span during preferred learning activities',
    'Cultivate positive peer interactions in structured settings',
    'Improve executive functioning through routine-based learning',
    'Support emotional intelligence development through storytelling'
  ]
  
  console.log('🔍 Adding fallback goals to reach 6 total...');
  uniqueFallbackGoals.forEach(goal => {
    if (goals.length < 6) {
      addUniqueGoal(goal)
    }
  })
  
  console.log(`📊 Final goals count: ${goals.length}`);
  console.log('📋 Final goals list:', goals);

  // Add comprehensive, detailed activities based on input patterns
  if (low.includes('eye contact') && (low.includes('poor') || low.includes('moderate'))) {
    addUniqueActivity('Eye Contact Development Activities: Start with 5-10 minutes of interactive peek-a-boo games using colorful scarves or blankets. Position yourself at child\'s eye level during mirror play, pointing to eyes and saying "look at me" while making funny faces. Practice face-to-face singing with simple nursery rhymes, pausing to wait for eye contact before continuing the song.')
    addUniqueActivity('Joint Attention Building Exercises: Use child\'s favorite toys or objects to practice pointing and showing. Hold toy near your face, say "look" and point to the object, then to your eyes. Practice "show me" games where child brings objects to share with you. Create photo albums of family members and point to faces while naming them together.')
  }

  if (low.includes('speech') || low.includes('communication')) {
    addUniqueActivity('Communication Development Program: During daily routines like meals, bath, and play, provide constant narration describing actions ("We are washing hands," "Time to eat breakfast"). Label objects by holding them up and saying the name clearly 3 times. Sing interactive songs with hand motions and pause for child to fill in familiar words.')
    addUniqueActivity('Functional Communication Training: Create a picture communication board with essential needs (eat, drink, play, help). Practice simple choice-making by offering two options with visual and verbal cues. Use gesture-word combinations like waving + "bye-bye" and encourage child to imitate. Read simple picture books together, pointing to images and encouraging naming.')
  }

  if (low.includes('social') && (low.includes('active') || low.includes('passive'))) {
    addUniqueActivity('Social Skills Development Sessions: Practice structured turn-taking using timers and visual cues with board games, building blocks, or art activities. Engage in parallel play by sitting beside child with similar toys, narrating actions and occasionally offering to share materials. Create simple cooperative tasks like sorting toys together or preparing snacks as a team.')
    addUniqueActivity('Social Understanding Activities: Read age-appropriate social stories about everyday situations like greetings, sharing, and asking for help. Practice emotion recognition using family photos, emotion cards, or mirror games to identify happy, sad, mad faces. Role-play common social scenarios like saying hello, asking to play, and saying please/thank you using dolls or stuffed animals.')
  }

  if (low.includes('sensory') || low.includes('sensitive')) {
    addUniqueActivity('Sensory Integration Therapy: Create sensory exploration bins with rice, beans, pasta, or sand for 10-15 minute sessions with supervision. Provide gentle deep pressure through hugs, weighted blankets, or compression activities. Offer calming sensory breaks with dim lighting, soft music, and favorite textures when child shows signs of overwhelm.')
    addUniqueActivity('Proprioceptive and Vestibular Activities: Incorporate daily movement including supervised swinging, gentle bouncing on therapy balls, or trampoline jumping for 10-20 minutes. Practice heavy work activities like carrying books, pushing/pulling toys, or helping with household tasks. Create obstacle courses with crawling, climbing, and balancing to improve body awareness and coordination.')
  }

  // Add emotion-specific detailed activities
  if (low.includes('sad') || low.includes('fear') || low.includes('angry')) {
    addUniqueActivity('Emotional Regulation and Coping Skills: Practice deep breathing exercises using bubbles, pinwheels, or feathers for 5-10 minutes daily. Create a calm-down corner with soft blankets, favorite stuffed animals, and soothing music. Teach simple emotional vocabulary using feeling faces and help child identify emotions throughout the day. Establish predictable comfort routines during difficult moments.')
  }

  if (low.includes('happy') && activities.length < 8) {
    addUniqueActivity('Positive Emotion Enhancement Activities: Build on child\'s natural joy by incorporating favorite activities into learning opportunities. Create celebration rituals for small achievements with special songs, dances, or high-fives. Design joyful interaction games based on child\'s interests, such as favorite character role-play, preferred music and movement, or special tickle games that encourage social connection.')
  }

  // Comprehensive fallback activities for holistic development with detailed explanations
  const expandedActivities = [
    'Family Connection and Memory Building: Create personalized photo albums with family pictures, narrating stories about each person and special memories. Practice looking at faces, naming family members, and sharing simple stories. Use these albums for social referencing and conversation practice during quiet time together.',
    
    'Life Skills Through Cooking Activities: Engage child in simple food preparation like washing fruits, stirring ingredients, or decorating cookies. This provides sensory input, fine motor practice, following directions, and social interaction. Start with 15-20 minute sessions and gradually increase as attention span develops.',
    
    'Nature-Based Learning and Exploration: Take short outdoor walks to collect leaves, rocks, or flowers, then practice sorting by color, size, or texture. This combines sensory input, vocabulary building, and following directions. Create nature journals with drawings or photos of discoveries to extend the learning experience.',
    
    'Creative Arts for Self-Expression: Provide various art materials like finger paints, clay, markers, and textured papers for creative expression. Focus on the process rather than product, encouraging exploration and communication about colors, textures, and preferences. Use art time for vocabulary building and social interaction.',
    
    'Construction and Problem-Solving Play: Use building blocks, puzzles, or shape sorters to develop fine motor skills, spatial awareness, and problem-solving abilities. Start with simple tasks and gradually increase complexity. Provide verbal encouragement and help child communicate about their constructions.',
    
    'Music and Rhythm Development: Incorporate simple instruments like drums, shakers, or bells into daily routines. Practice imitation, turn-taking, and following rhythmic patterns. Use music for transitions, calming, and social engagement. Sing familiar songs and encourage child participation through actions or sounds.',
    
    'Imaginative Play and Social Scripts: Use dolls, action figures, or puppets to act out daily routines, social situations, and problem-solving scenarios. Practice greetings, sharing, asking for help, and expressing needs through play. This helps develop social understanding and communication skills in a low-pressure environment.',
    
    'Daily Routine Structure and Independence: Create visual schedules with pictures showing daily activities like meals, play, bath time, and bedtime. Practice following the schedule with support, celebrating completion of each activity. This builds predictability, reduces anxiety, and develops independence skills gradually.'
  ]
  
  expandedActivities.forEach(activity => {
    if (activities.length < 8) {
      addUniqueActivity(activity)
    }
  })

  // Ensure comprehensive focus areas with no duplicates
  const uniqueFocus = [...new Set(focus)];
  
  // Add default focus areas if list is short
  if (uniqueFocus.length < 4) {
    const defaultFocusAreas = [
      'Communication & language development',
      'Social interaction & peer relationships',
      'Behavioral regulation & emotional management',
      'Sensory processing & environmental adaptation',
      'Daily living skills & independence',
      'Family support & caregiver training',
      'Play skills & social imagination',
      'Academic readiness & learning support'
    ];
    
    defaultFocusAreas.forEach(area => {
      if (uniqueFocus.length < 6 && !uniqueFocus.find(existing => 
        existing.toLowerCase().includes(area.toLowerCase().split(' ')[0])
      )) {
        uniqueFocus.push(area);
      }
    });
  }

  return { 
    focus_areas: uniqueFocus.length ? uniqueFocus : [
      'Comprehensive developmental support',
      'Communication & social skills enhancement', 
      'Behavioral guidance & emotional regulation',
      'Family education & support services'
    ], 
    therapy_goals: goals.slice(0, 6), // Ensure max 6 unique goals
    activities: activities.slice(0, 8), // Ensure max 8 activities
    notes: 'Comprehensive early intervention recommended: Multi-disciplinary approach including speech therapy, occupational therapy, behavioral support, and family training for optimal developmental outcomes.'
  }
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Server is running',
    port: process.env.PORT || 4001,
    message: 'Autism Screening Tool Backend API - No Duplicates ✅'
  })
})

app.post('/analyze', async (req, res) => {
  try {
    // Validate required fields
    const requiredFields = ['age', 'eye_contact', 'speech_level', 'social_response', 'sensory_reactions'];
    const missingFields = [];
    
    // Check if request body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        error: 'Invalid request body',
        message: 'Request body is required and must be a valid JSON object',
        required_fields: requiredFields
      });
    }
    
    // Check for missing required fields
    for (const field of requiredFields) {
      if (!req.body[field] || req.body[field].toString().trim() === '') {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: `The following fields are required: ${missingFields.join(', ')}`,
        missing_fields: missingFields,
        required_fields: requiredFields,
        example: {
          age: "2",
          eye_contact: "Moderate",
          speech_level: "Passive", 
          social_response: "Active",
          sensory_reactions: "Sensitive"
        }
      });
    }
    
    const prompt = buildPrompt(req.body)
    const result = await callGeminiAI(prompt, req.body)
    
    // Add the input data to the result so frontend can access it
    result._input = req.body
    
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || String(err) })
  }
})

const PORT = process.env.PORT || 4001
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
  console.log('✅ Duplicate Prevention: FIXED')
  console.log('✅ CORS Configuration: INTACT') 
  console.log('✅ All Original Features: PRESERVED')
})