export type Question = {
  id: string;
  era: string;
  clue: string;
  options: string[];
  answer: string;
  fact: string;
};

export type DailyQuiz = {
  day: number;
  title: string;
  subtitle: string;
  date: string;
  questions: Question[];
};

export const POINTS_FIRST_TRY = 10;
export const POINTS_SECOND_TRY = 5;
export const POINTS_THIRD_TRY = 2;
export const MAX_POINTS = 30;

export function pointsFor(wrongAttempts: number): number {
  if (wrongAttempts === 0) return POINTS_FIRST_TRY;
  if (wrongAttempts === 1) return POINTS_SECOND_TRY;
  return POINTS_THIRD_TRY;
}

export function getQuizForDay(day: number): DailyQuiz {
  return DAILY_QUIZZES.find(q => q.day === day) || DAILY_QUIZZES[0];
}

export const DAILY_QUIZZES: DailyQuiz[] = [
  // =========================================================================
  // DAY 1
  // =========================================================================
  {
    day: 1,
    title: 'Pioneers & Philosophers',
    subtitle: 'Vedic debaters, naval queens & combat aviators',
    date: 'October 11, 2026',
    questions: [
      {
        id: 'day1-q1',
        era: 'Ancient India · Vedic Era',
        clue: 'I stood in the crowded court of King Janaka and challenged the venerated sage Yajnavalkya on the ultimate fabric of metaphysics until the hall fell silent.',
        options: ['Maitreyi', 'Lopamudra', 'Gargi Vachaknavi', 'Sulabha'],
        answer: 'Gargi Vachaknavi', // Position C
        fact: 'Gargi Vachaknavi was an ancient Vedic philosopher who famously debated Yajnavalkya in the Brihadaranyaka Upanishad, exploring the cosmic structure of reality.',
      },
      {
        id: 'day1-q2',
        era: 'Medieval India · 16th Century',
        clue: 'Known as "Abhaya Rani" of Ullal, I commanded coastal naval fleets and defended India’s western shores against Portuguese colonial armada for decades.',
        options: ['Rani Rudrama Devi', 'Rani Abbakka Chowta', 'Rani Durgavati', 'Chand Bibi'],
        answer: 'Rani Abbakka Chowta', // Position B
        fact: 'Rani Abbakka Chowta of Ullal fought off Portuguese colonial invaders in repeated naval engagements along the Konkan-Karnataka coastline.',
      },
      {
        id: 'day1-q3',
        era: 'Modern India · 21st Century',
        clue: 'I shattered the sound barrier and gender barriers alike, becoming the first female fighter pilot in the IAF to fly the indigenous supersonic LCA Tejas combat jet.',
        options: ['Gunjan Saxena', 'Kalpana Chawla', 'Captain Lakshmi Sahgal', 'Mohana Singh Jitarwal'],
        answer: 'Mohana Singh Jitarwal', // Position D
        fact: 'Squadron Leader Mohana Singh Jitarwal, alongside Avani Chaturvedi and Bhawana Kanth, formed India’s historic first trio of women combat fighter pilots.',
      },
    ],
  },

  // =========================================================================
  // DAY 2
  // =========================================================================
  {
    day: 2,
    title: 'Warriors of Valor & Steel',
    subtitle: 'Rigvedic fighters, pepper monarchs & fearless secret agents',
    date: 'October 12, 2026',
    questions: [
      {
        id: 'day2-q1',
        era: 'Ancient India · Rigvedic Era',
        clue: 'When I lost my leg in fierce combat, the divine Ashvins fitted me with an iron prosthesis so I could march back onto the battlefield to fight.',
        options: ['Satyabhama', 'Vishpala', 'Kaikeyi', 'Ghosha'],
        answer: 'Vishpala', // Position B
        fact: 'Vishpala is celebrated in the Rigveda as a fierce warrior queen who received an iron prosthetic leg (Ayasi Jangha) to continue fighting.',
      },
      {
        id: 'day2-q2',
        era: 'Medieval India · 16th Century',
        clue: 'The Portuguese dubbed me the "Rani of Pepper" (Raina da Pimenta); I ruled Gerusoppa for 54 prosperous years and crushed foreign naval intrusions.',
        options: ['Keladi Chennamma', 'Belawadi Mallamma', 'Tarabai', 'Chennabhairadevi'],
        answer: 'Chennabhairadevi', // Position D
        fact: 'Rani Chennabhairadevi was the longest-ruling queen in Indian history, commanding the spice trade of Karnataka and defending her ports from colonization.',
      },
      {
        id: 'day2-q3',
        era: 'Modern India · Freedom Movement',
        clue: 'As an INA secret intelligence operative, I endured brutal British torture in prison without ever divulging Netaji Subhash Chandra Bose’s whereabouts.',
        options: ['Neera Arya', 'Durga Bhabhi', 'Pritilata Waddedar', 'Kanaklata Barua'],
        answer: 'Neera Arya', // Position A
        fact: 'Neera Arya was a fearless INA veteran and spy who sacrificed everything in British captivity to protect Netaji and India’s freedom struggle.',
      },
    ],
  },

  // =========================================================================
  // DAY 3
  // =========================================================================
  {
    day: 3,
    title: 'Guardians of Dharma & Law',
    subtitle: 'Vedic tapasvinis, temple architects & legal pioneers',
    date: 'October 13, 2026',
    questions: [
      {
        id: 'day3-q1',
        era: 'Ancient India · Epic Era',
        clue: 'Wife of Atri Rishi, I am revered as the supreme ideal of tapas and austerity; I welcomed Sita into the forest and gifted her divine garments and jewels.',
        options: ['Lopamudra', 'Maitreyi', 'Mata Anusuya', 'Sulabha'],
        answer: 'Mata Anusuya', // Position C
        fact: 'Mata Anusuya is honored in the Ramayana for her immense spiritual power, welcoming Rama, Lakshmana, and Sita and counseling Sita on dharma.',
      },
      {
        id: 'day3-q2',
        era: 'Medieval India · 18th Century',
        clue: 'From Maheshwar on the banks of the Narmada, I governed Malwa with justice and rebuilt sacred temples and ghats from Somnath to Kashi Vishwanath.',
        options: ['Ahilyabai Holkar', 'Rani Bhawani', 'Rani Rashmoni', 'Tarabai'],
        answer: 'Ahilyabai Holkar', // Position A
        fact: 'Maharani Ahilyabai Holkar of Indore is celebrated across India for her exceptional governance, charity, and pan-Indian temple reconstructions.',
      },
      {
        id: 'day3-q3',
        era: 'Modern India · Legal Era',
        clue: 'I became India’s first female advocate, fighting tirelessly in court for thousands of purdahnashin women who were denied legal representation and property rights.',
        options: ['Anna Rajam Malhotra', 'Cornelia Sorabji', 'C. B. Muthamma', 'Kiran Bedi'],
        answer: 'Cornelia Sorabji', // Position B
        fact: 'Cornelia Sorabji was the first female graduate from Bombay University and the first woman to practice law in India and Britain.',
      },
    ],
  },

  // =========================================================================
  // DAY 4
  // =========================================================================
  {
    day: 4,
    title: 'Crowns of Courage & Science',
    subtitle: 'Gupta regents, fortress defenders & chemical pioneers',
    date: 'October 14, 2026',
    questions: [
      {
        id: 'day4-q1',
        era: 'Ancient India · 4th–5th Century CE',
        clue: 'Daughter of Chandragupta II, I ruled the Vakataka Empire as regent with sovereign authority, issuing royal land charters bearing the emblem of Vishnu.',
        options: ['Kumaradevi', 'Naganika', 'Prabhavati Gupta', 'Karuvaki'],
        answer: 'Prabhavati Gupta', // Position C
        fact: 'Prabhavati Gupta was a powerful Gupta-Vakataka ruler who exercised full sovereign political and administrative control over the Deccan.',
      },
      {
        id: 'day4-q2',
        era: 'Medieval India · 14th Century',
        clue: 'Immortalized in the traditions of Chittorgarh, I led the historic First Jauhar (1303) alongside Rajput women to protect honor against Alauddin Khilji.',
        options: ['Rani Karnavati', 'Rani Phool Kanwar', 'Rani Durgavati', 'Rani Padmini'],
        answer: 'Rani Padmini', // Position D
        fact: 'Rani Padmini (Padmavati) of Mewar is an eternal symbol of supreme courage and dignity in the face of imperial siege at Chittor.',
      },
      {
        id: 'day4-q3',
        era: 'Modern India · 20th Century',
        clue: 'I was the first Indian woman to receive a Doctorate of Science, developing anti-malarial (Ayush-56) and anti-epileptic medicines from native Indian flora.',
        options: ['Dr. Asima Chatterjee', 'Kamala Sohonie', 'Dr. Indira Hinduja', 'Janaki Ammal'],
        answer: 'Dr. Asima Chatterjee', // Position A
        fact: 'Dr. Asima Chatterjee made monumental contributions to organic chemistry, alkaloids, and Indian medicinal plant research at the University of Calcutta.',
      },
    ],
  },

  // =========================================================================
  // DAY 5
  // =========================================================================
  {
    day: 5,
    title: 'Defenders of the Fort & the Cosmos',
    subtitle: 'Royal patrons, fort sentinels & missile architects',
    date: 'October 15, 2026',
    questions: [
      {
        id: 'day5-q1',
        era: 'Ancient India · 12th Century',
        clue: 'A queen of the Gahadavala dynasty and devout Buddhist patron, I constructed the magnificent Dharmachakra Jina Vihara at the sacred site of Sarnath.',
        options: ['Prabhavati Gupta', 'Kumaradevi', 'Naganika', 'Didda'],
        answer: 'Kumaradevi', // Position B
        fact: 'Queen Kumaradevi’s stone inscription at Sarnath records her royal patronage and dedication to peace and Buddhist philosophy.',
      },
      {
        id: 'day5-q2',
        era: 'Medieval India · 18th Century',
        clue: 'While fetching water at Chitradurga Fort, I spotted invading troops slipping through a hidden rock crevice and struck them down one by one using a wooden pestle.',
        options: ['Mata Bhag Kaur', 'Belawadi Mallamma', 'Onake Obavva', 'Keladi Chennamma'],
        answer: 'Onake Obavva', // Position C
        fact: 'Onake Obavva is a celebrated folk heroine of Karnataka who single-handedly guarded the Onake Kindi passage in Chitradurga against Hyder Ali’s forces.',
      },
      {
        id: 'day5-q3',
        era: 'Modern India · Space & Missile Era',
        clue: 'Revered as the "Missile Woman of India", I became the first female scientist to lead strategic inter-continental missile projects (Agni-IV & V) at DRDO.',
        options: ['Dr. Ritu Karidhal', 'Muthayya Vanitha', 'T. K. Anuradha', 'Dr. Tessy Thomas'],
        answer: 'Dr. Tessy Thomas', // Position D
        fact: 'Dr. Tessy Thomas served as the Project Director for the Agni-IV missile system and Director General of Aeronautical Systems at DRDO.',
      },
    ],
  },

  // =========================================================================
  // DAY 6
  // =========================================================================
  {
    day: 6,
    title: 'Mind, Math & Enterprise',
    subtitle: 'Naneghat rulers, math scholars & self-made industrialists',
    date: 'October 16, 2026',
    questions: [
      {
        id: 'day6-q1',
        era: 'Ancient India · 1st Century BCE',
        clue: 'My deeds, grand Vedic sacrifices, and administration as regent of the Satavahana dynasty are immortalized on the rock walls of Naneghat Pass.',
        options: ['Naganika', 'Nayanika', 'Karuvaki', 'Prabhavati Gupta'],
        answer: 'Naganika', // Position A
        fact: 'Queen Naganika was the prominent queen of Satakarni I; the Naneghat inscription is one of India’s most important ancient numismatic and epigraphic records.',
      },
      {
        id: 'day6-q2',
        era: 'Medieval India · 12th Century',
        clue: 'My mathematical curiosity inspired Bhaskara II to dedicate his legendary treatise on arithmetic, quadratic equations, and combinations to my name.',
        options: ['Molla', 'Lilavati', 'Andal', 'Sulabha'],
        answer: 'Lilavati', // Position B
        fact: 'Lilavati is the celebrated mathematical work written by Bhaskara II in poetic Sanskrit verses addressed to his daughter Lilavati.',
      },
      {
        id: 'day6-q3',
        era: 'Modern India · Industrial Era',
        clue: 'Born into acute poverty and child marriage, I overcame every societal odd to become a self-made industrialist and turn Kamani Tubes into a thriving manufacturing giant.',
        options: ['Kiran Mazumdar-Shaw', 'Falguni Nayar', 'Kalpana Saroj', 'Vandana Luthra'],
        answer: 'Kalpana Saroj', // Position C
        fact: 'Kalpana Saroj was awarded the Padma Shri for Trade and Industry after restructuring and reviving the distressed Kamani Tubes company.',
      },
    ],
  },

  // =========================================================================
  // DAY 7
  // =========================================================================
  {
    day: 7,
    title: 'Devotion, Poetry & Olympic Glory',
    subtitle: 'Bhakti saint poets & world sports champions',
    date: 'October 17, 2026',
    questions: [
      {
        id: 'day7-q1',
        era: 'Ancient India · Satavahana Era',
        clue: 'I served as a vital political matriarch in the Satavahana realm, guiding Deccan governance and preserving royal lineage through troubled successions.',
        options: ['Naganika', 'Karuvaki', 'Didda', 'Nayanika'],
        answer: 'Nayanika', // Position D
        fact: 'Queen Nayanika played an instrumental role in Deccan politics and royal dynastic affairs during the Satavahana era.',
      },
      {
        id: 'day7-q2',
        era: 'Medieval India · 8th Century',
        clue: 'The only female among the twelve Vaishnava Alwar saints of Tamil Nadu, I composed the immortal devotional verses of Tiruppavai and Nachiyar Tirumoli.',
        options: ['Karaikkal Ammaiyar', 'Andal', 'Molla', 'Akka Mahadevi'],
        answer: 'Andal', // Position B
        fact: 'Andal is revered across South India as an embodiment of pure Bhakti poetry whose songs are chanted daily in temples and households.',
      },
      {
        id: 'day7-q3',
        era: 'Modern India · Olympic Arena',
        clue: 'At the Sydney 2000 Olympic Games, I lifted 240 kg in the 69 kg weightlifting category to become the first Indian woman ever to win an Olympic medal.',
        options: ['P. T. Usha', 'Mary Kom', 'Karnam Malleswari', 'P. V. Sindhu'],
        answer: 'Karnam Malleswari', // Position C
        fact: 'Karnam Malleswari created history by winning the Olympic Bronze medal in Sydney 2000, paving the way for generations of Indian female athletes.',
      },
    ],
  },

  // =========================================================================
  // DAY 8
  // =========================================================================
  {
    day: 8,
    title: 'Mothers of Nations & Grassroots Crusaders',
    subtitle: 'Ashokan benefactors, Swarajya architects & silent humanitarians',
    date: 'October 18, 2026',
    questions: [
      {
        id: 'day8-q1',
        era: 'Ancient India · 3rd Century BCE',
        clue: 'Empress of Emperor Ashoka, my personal charitable gifts, mango groves, and monasteries are uniquely commemorated in the Queen’s Edict on the Allahabad Pillar.',
        options: ['Kumaradevi', 'Karuvaki', 'Prabhavati Gupta', 'Gargi'],
        answer: 'Karuvaki', // Position B
        fact: 'Karuvaki is the only queen named in Emperor Ashoka’s imperial edicts, noted for her compassion, charity, and public welfare works.',
      },
      {
        id: 'day8-q2',
        era: 'Medieval India · 17th Century',
        clue: 'Mother and political guide to Chhatrapati Shivaji Maharaj, I administered Pune jahgir, dispensed swift justice, and instilled the dream of Hindavi Swarajya.',
        options: ['Tarabai', 'Ahilyabai Holkar', 'Rani Durgavati', 'Rajmata Jijabai (Jija Mata)'],
        answer: 'Rajmata Jijabai (Jija Mata)', // Position D
        fact: 'Rajmata Jijabai was the bedrock of Shivaji Maharaj’s character and statesmanship, widely revered as the visionary architect of Maratha freedom.',
      },
      {
        id: 'day8-q3',
        era: 'Modern India · Grassroots Humanitarian',
        clue: 'Known across social media and the Bright Hope Foundation, I dedicated my life to performing dignified last rites and sacred cremations for over 4,000 unclaimed bodies.',
        options: ['Pooja Sharma ("Rekha")', 'Laxmi Agarwal', 'Sunitha Krishnan', 'Tanya Mittal'],
        answer: 'Pooja Sharma ("Rekha")', // Position A
        fact: 'Pooja Sharma has dedicated her life to ensuring that abandoned and unclaimed individuals receive love, respect, and dignified final rites.',
      },
    ],
  },

  // =========================================================================
  // DAY 9
  // =========================================================================
  {
    day: 9,
    title: 'Rulers, Epics & Trailblazing Arts',
    subtitle: 'Kashmir sovereigns, Telugu poets & comedy icons',
    date: 'October 19, 2026',
    questions: [
      {
        id: 'day9-q1',
        era: 'Ancient India · 10th Century',
        clue: 'I governed Kashmir for over four decades as regent and sovereign queen, navigating treacherous palace conspiracies with unmatched political cunning.',
        options: ['Naganika', 'Didda', 'Karuvaki', 'Prabhavati Gupta'],
        answer: 'Didda', // Position B
        fact: 'Queen Didda of Kashmir is recorded in Kalhana’s Rajatarangini as one of the most powerful and shrewd rulers of northern India.',
      },
      {
        id: 'day9-q2',
        era: 'Medieval India · 16th Century',
        clue: 'Born into a humble potter family in Andhra, I defied caste conventions to translate and author the beloved, lyrical Molla Ramayanam in spoken Telugu.',
        options: ['Andal', 'Karaikkal Ammaiyar', 'Atukuri Molla', 'Lilavati'],
        answer: 'Atukuri Molla', // Position C
        fact: 'Atukuri Molla is celebrated as one of Telugu literature’s greatest poets, democratizing the Ramayana into simple, evocative verse.',
      },
      {
        id: 'day9-q3',
        era: 'Modern India · Arts & Comedy',
        clue: 'Breaking rigid film stereotypes in 1950s Hindi cinema, I established women in comedy as India’s first female stand-up and comic movie superstar.',
        options: ['Bharti Singh', 'Manjamma Jogathi', 'Rukmini Devi Arundale', 'Tun Tun (Uma Devi Khatri)'],
        answer: 'Tun Tun (Uma Devi Khatri)', // Position D
        fact: 'Originally a playback singer (singing "Afsana Likh Rahi Hoon"), Tun Tun became India’s first widely acclaimed female comedian in cinema.',
      },
    ],
  },

  // =========================================================================
  // DAY 10: THE GRAND FINALE
  // =========================================================================
  {
    day: 10,
    title: 'The Grand Finale Championship',
    subtitle: 'The supreme test: 10 questions honoring India’s immortal heroines',
    date: 'October 20, 2026',
    questions: [
      {
        id: 'day10-q1',
        era: 'Ancient India · Epic Philosophy',
        clue: 'In the Mahabharata’s Mokshadharma Parva, I entered a philosophical debate with King Janaka on equal terms, demonstrating that true spiritual freedom knows no gender.',
        options: ['Sulabha', 'Gargi Vachaknavi', 'Maitreyi', 'Lopamudra'],
        answer: 'Sulabha', // Position A
        fact: 'Sulabha was a wandering ascetic philosopher who debated King Janaka of Mithila on detached sovereignty and yogic liberation.',
      },
      {
        id: 'day10-q2',
        era: 'Medieval India · 16th Century',
        clue: 'Queen of Garha-Katanga (Gondwana), I led my cavalry into battle against the Mughal armies of Asaf Khan and chose to die on the battlefield rather than surrender.',
        options: ['Rani Abbakka Chowta', 'Rani Durgavati', 'Chand Bibi', 'Rani Karnavati'],
        answer: 'Rani Durgavati', // Position B
        fact: 'Rani Durgavati was a Rajput princess who married into the Gond royal house and defended her kingdom with heroic martyrdom in 1564.',
      },
      {
        id: 'day10-q3',
        era: 'Modern India · Freedom Movement',
        clue: 'A physician and revolutionary, I was appointed by Netaji Subhash Chandra Bose as the Commander of the Rani of Jhansi Regiment — Asia’s first all-female combat brigade.',
        options: ['Aruna Asaf Ali', 'Matangini Hazra', 'Captain Lakshmi Sahgal', 'Rani Gaidinliu'],
        answer: 'Captain Lakshmi Sahgal', // Position C
        fact: 'Captain Dr. Lakshmi Sahgal led the women’s brigade of the INA and later spent decades serving poor patients in Kanpur.',
      },
      {
        id: 'day10-q4',
        era: 'Medieval India · 17th Century',
        clue: 'When Shah Jahan’s Mughal army invaded Garhwal under Najabat Khan, I encircled their forces in the mountain gorges and cut off their noses as a permanent reminder.',
        options: ['Keladi Chennamma', 'Belawadi Mallamma', 'Tarabai', 'Rani Karnavati of Garhwal'],
        answer: 'Rani Karnavati of Garhwal', // Position D
        fact: 'Rani Karnavati of Garhwal is remembered in history as "Nakti Rani" for her defeat of the Mughal expedition in the Himalayan foothills.',
      },
      {
        id: 'day10-q5',
        era: 'Modern India · 1942 Movement',
        clue: 'During the Quit India Movement, I secretly ran the underground "Secret Congress Radio", broadcasting uncensored nationalist news across India until arrested.',
        options: ['Dr. Usha Mehta', 'Durga Bhabhi', 'Tara Rani Srivastava', 'Aruna Asaf Ali'],
        answer: 'Dr. Usha Mehta', // Position A
        fact: 'Dr. Usha Mehta was a 22-year-old student when she set up the clandestine radio station that kept India’s freedom spirit burning in 1942.',
      },
      {
        id: 'day10-q6',
        era: 'Modern India · Science & Space',
        clue: 'I served as the Project Director for ISRO’s Chandrayaan-2 lunar exploration mission, becoming the first woman to lead an interplanetary mission in India.',
        options: ['Dr. Tessy Thomas', 'Muthayya Vanitha', 'Dr. Ritu Karidhal', 'Anna Mani'],
        answer: 'Muthayya Vanitha', // Position B
        fact: 'Muthayya Vanitha was the Project Director of Chandrayaan-2 and was named one of Nature’s top scientists to watch.',
      },
      {
        id: 'day10-q7',
        era: 'Modern India · Sports Icon',
        clue: 'Mother of three, 6-time World Amateur Boxing Champion, and Olympic medalist from Manipur who redefined combat athletics for women across the globe.',
        options: ['P. V. Sindhu', 'Saikhom Mirabai Chanu', 'M. C. Mary Kom', 'Manu Bhaker'],
        answer: 'M. C. Mary Kom', // Position C
        fact: 'Magnificent Mary Kom is the only woman boxer to have won a medal in each one of the first seven World Championships.',
      },
      {
        id: 'day10-q8',
        era: 'Modern India · Performing Arts & Folklore',
        clue: 'A transgender folk artist from Karnataka, I preserved the traditional Jogathi Nritya folk dance, led the Karnataka Janapada Academy, and was awarded the Padma Shri.',
        options: ['Rukmini Devi Arundale', 'Silk Smitha', 'Tun Tun', 'Manjamma Jogathi'],
        answer: 'Manjamma Jogathi', // Position D
        fact: 'Manjamma Jogathi overcame stigma and poverty to become one of Karnataka’s most celebrated cultural ambassadors and folk masters.',
      },
      {
        id: 'day10-q9',
        era: 'Medieval India · 18th Century',
        clue: 'After Chhatrapati Rajaram passed away, I personally commanded Maratha cavalry regiments, governed the empire, and led the 7-year war of resistance against Aurangzeb.',
        options: ['Tarabai Bhosale', 'Rajmata Jijabai', 'Ahilyabai Holkar', 'Rani Bhawani'],
        answer: 'Tarabai Bhosale', // Position A
        fact: 'Maharani Tarabai took charge of the Maratha state during its darkest hour, outmaneuvering Aurangzeb’s massive armies until his demise in 1707.',
      },
      {
        id: 'day10-q10',
        era: 'Modern India · Supreme Statesmanship',
        clue: 'Born in Mayurbhanj, Odisha, I rose from grassroots teaching and public service to become the first tribal woman and second female President of the Republic of India.',
        options: ['Pratibha Patil', 'Droupadi Murmu', 'Sushma Swaraj', 'Nirmala Sitharaman'],
        answer: 'Droupadi Murmu', // Position B
        fact: 'President Droupadi Murmu made history in 2022 as the youngest and first tribal person elected as the Head of State of India.',
      },
    ],
  },
];

export const QUESTIONS = DAILY_QUIZZES[0].questions;
