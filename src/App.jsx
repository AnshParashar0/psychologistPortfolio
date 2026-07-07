import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ArrowRight, BookOpen, Heart, Brain, MessageCircle, Users, Sparkles, Clock, Mail, Phone, MapPin, ArrowUpRight, X, Calendar, User } from 'lucide-react'
import './index.css'

/* ──────────────────────────────────────────────
   Custom Hook: useTypewriter
   ────────────────────────────────────────────── */
function useTypewriter(text, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    let index = 0

    const delayTimer = setTimeout(() => {
      const interval = setInterval(() => {
        index++
        if (index <= text.length) {
          setDisplayed(text.slice(0, index))
        } else {
          setDone(true)
          clearInterval(interval)
        }
      }, speed)

      return () => clearInterval(interval)
    }, startDelay)

    return () => clearTimeout(delayTimer)
  }, [text, speed, startDelay])

  return { displayed, done }
}

/* ──────────────────────────────────────────────
   Component: BackgroundFrames (image-sequence scrubbing)
   97 pre-extracted JPEG frames → zero decode lag
   ────────────────────────────────────────────── */
const TOTAL_FRAMES = 97

function getFrameSrc(index) {
  const num = String(Math.min(Math.max(index, 1), TOTAL_FRAMES)).padStart(3, '0')
  return `/frames/frame_${num}.jpg`
}

function BackgroundFrames() {
  const canvasRef = useRef(null)
  const imagesRef = useRef([])
  const currentFrameRef = useRef(0)
  const targetFrameRef = useRef(0)
  const rafIdRef = useRef(null)
  const prevXRef = useRef(null)
  const [loaded, setLoaded] = useState(false)

  // Preload all frames into Image objects
  useEffect(() => {
    let cancelled = false
    const images = []
    let count = 0

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image()
      img.src = getFrameSrc(i)
      img.onload = () => {
        count++
        if (count === TOTAL_FRAMES && !cancelled) {
          imagesRef.current = images
          setLoaded(true)
          // Draw first frame
          drawFrame(0)
        }
      }
      images.push(img)
    }

    return () => { cancelled = true }
  }, [])

  // Draw a specific frame index onto the canvas
  const drawFrame = useCallback((index) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const img = imagesRef.current[index]
    if (!img) return

    // Match canvas size to container
    const rect = canvas.parentElement.getBoundingClientRect()
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width
      canvas.height = rect.height
    }

    // Cover-fit the image (like object-fit: cover + object-position: right)
    const imgRatio = img.naturalWidth / img.naturalHeight
    const canvasRatio = canvas.width / canvas.height
    let drawW, drawH, offsetX, offsetY

    if (canvasRatio > imgRatio) {
      drawW = canvas.width
      drawH = canvas.width / imgRatio
      offsetX = 0
      offsetY = (canvas.height - drawH) / 2
    } else {
      drawH = canvas.height
      drawW = canvas.height * imgRatio
      // Align to right side
      offsetX = canvas.width - drawW
      offsetY = 0
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH)
  }, [])

  // Smooth lerp animation loop
  const tick = useCallback(() => {
    const target = targetFrameRef.current
    const current = currentFrameRef.current
    const diff = target - current

    if (Math.abs(diff) < 0.3) {
      currentFrameRef.current = target
      drawFrame(Math.round(target))
      rafIdRef.current = null
      return
    }

    const next = current + diff * 0.12
    currentFrameRef.current = next
    drawFrame(Math.round(next))
    rafIdRef.current = requestAnimationFrame(tick)
  }, [drawFrame])

  // Desktop mouse scrubbing
  useEffect(() => {
    if (!loaded) return

    function handleMouseMove(e) {
      if (window.innerWidth < 1024) return

      const currentX = e.clientX
      if (prevXRef.current !== null) {
        const delta = currentX - prevXRef.current
        const frameDelta = (delta / window.innerWidth) * TOTAL_FRAMES * 0.8
        targetFrameRef.current = Math.max(
          0,
          Math.min(TOTAL_FRAMES - 1, targetFrameRef.current + frameDelta)
        )
        if (!rafIdRef.current) rafIdRef.current = requestAnimationFrame(tick)
      }
      prevXRef.current = currentX
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    }
  }, [loaded, tick])

  // Mobile: auto-cycle through frames
  useEffect(() => {
    if (!loaded) return
    if (window.innerWidth >= 1024) return

    let frame = 0
    let direction = 1
    const interval = setInterval(() => {
      frame += direction
      if (frame >= TOTAL_FRAMES - 1) direction = -1
      if (frame <= 0) direction = 1
      drawFrame(frame)
    }, 1000 / 24)

    return () => clearInterval(interval)
  }, [loaded, drawFrame])

  // Resize canvas on window resize
  useEffect(() => {
    function handleResize() {
      drawFrame(Math.round(currentFrameRef.current))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [drawFrame])

  return (
    <div className="order-last lg:order-none relative lg:absolute lg:inset-0 lg:z-0 overflow-hidden pointer-events-none w-full aspect-square md:aspect-video lg:aspect-auto lg:h-full bg-neutral-50 lg:bg-transparent">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </div>
  )
}

/* ──────────────────────────────────────────────
   Component: Navbar (Interactive)
   ────────────────────────────────────────────── */
function Navbar({ onOpenModal }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navLinks = [
    { label: 'Specialties', href: '#specialties' },
    { label: 'About', href: '#about' },
    { label: 'Approach', href: '#approach' },
    { label: 'Resources', href: '#resources' },
  ]

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 px-5 sm:px-8 py-4 sm:py-5 flex flex-row justify-between items-center bg-transparent">
        {/* Logo */}
        <div className="flex flex-row items-center gap-2">
          <span className="text-[21px] sm:text-[24px] tracking-tight text-black font-semibold select-none">
            Dr. Sarah Jenkins
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#4D6D47] ml-2 hidden sm:inline-block border border-[#4D6D47]/30 px-2 py-1 rounded-full bg-white/50 backdrop-blur-sm">
            Clinical Psychologist
          </span>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex flex-row items-center text-[17px] text-black font-medium">
          {navLinks.map((link, i) => (
            <span key={link.label} className="flex items-center">
              <a
                href={link.href}
                className="hover:text-[#4D6D47] transition-colors"
              >
                {link.label}
              </a>
              {i < navLinks.length - 1 && (
                <span className="mx-5 opacity-20">|</span>
              )}
            </span>
          ))}
        </nav>

        {/* Desktop CTA */}
        <button
          onClick={onOpenModal}
          className="hidden md:inline px-6 py-2.5 bg-[#1C2E1E] text-white rounded-full text-sm font-medium hover:bg-[#2A4A2E] transition-colors shadow-sm cursor-pointer"
        >
          Book Appointment
        </button>

        {/* Hamburger button (mobile) */}
        <button
          className="md:hidden flex flex-col justify-center items-center gap-[5px] w-8 h-8 z-[11]"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={`block w-6 h-[2px] bg-black transition-all duration-300 ${
              isMobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
            }`}
          />
          <span
            className={`block w-6 h-[2px] bg-black transition-all duration-300 ${
              isMobileMenuOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`block w-6 h-[2px] bg-black transition-all duration-300 ${
              isMobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
            }`}
          />
        </button>
      </header>

      {/* Mobile Navigation Overlay */}
      <div
        className={`fixed inset-0 z-[9] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center gap-8 transition-all duration-300 md:hidden ${
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        {navLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-3xl text-black font-medium hover:text-[#4D6D47] transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {link.label}
          </a>
        ))}
        <button
          onClick={() => { setIsMobileMenuOpen(false); onOpenModal(); }}
          className="px-8 py-3 bg-[#1C2E1E] text-white rounded-full text-lg font-medium hover:bg-[#2A4A2E] transition-colors mt-4 cursor-pointer"
        >
          Book Appointment
        </button>
      </div>
    </>
  )
}

/* ──────────────────────────────────────────────
   Component: ServicePills (Multi-select)
   ────────────────────────────────────────────── */
function ServicePills({ onOpenModal }) {
  const [services, setServices] = useState([])

  const options = [
    'Anxiety & Stress',
    'Depression',
    'Trauma & PTSD',
    'Life Transitions',
    'Couples Therapy',
  ]

  const toggleService = useCallback((service) => {
    setServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    )
  }, [])

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2 text-black">
        What brings you here today?
      </h2>
      <p className="opacity-85 text-[#738273] mb-8 font-medium">
        Select the areas you'd like to address
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        {options.map((option) => {
          const isActive = services.includes(option)
          return (
            <motion.button
              key={option}
              onClick={() => toggleService(option)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`px-5 py-3 rounded-full text-sm font-medium cursor-pointer flex items-center gap-2 transition-colors duration-200 ${
                isActive
                  ? 'bg-[#1C2E1E] text-white shadow-md shadow-emerald-950/5'
                  : 'bg-white text-[#1C2E1E] border border-[#F1F3F1] hover:bg-[#F1F3F1]/55'
              }`}
            >
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    initial={{ scale: 0, width: 0 }}
                    animate={{ scale: 1, width: 'auto' }}
                    exit={{ scale: 0, width: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 20,
                    }}
                    className="inline-flex"
                  >
                    <Check size={16} />
                  </motion.span>
                )}
              </AnimatePresence>
              {option}
            </motion.button>
          )
        })}
      </div>

      {/* Feedback status banner */}
      <AnimatePresence mode="wait">
        {services.length === 0 ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="text-sm text-[#738273] font-medium"
          >
            Please select the areas you are seeking help with.
          </motion.p>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="bg-[#FAFBF9] border border-[#F1F3F1] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <p className="text-sm text-[#1C2E1E]">
              Primary focus areas:{' '}
              <span className="font-semibold">{services.join(', ')}</span>
            </p>
            <button onClick={onOpenModal} className="flex items-center gap-1.5 text-[#4D6D47] uppercase text-xs font-bold tracking-wider hover:opacity-70 transition-opacity cursor-pointer">
              Schedule Consultation <ArrowRight size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ──────────────────────────────────────────────
   Hook: useInView (scroll-triggered animations)
   ────────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, inView]
}

/* ──────────────────────────────────────────────
   Section: Therapy (Services)
   ────────────────────────────────────────────── */
function TherapySection() {
  const [ref, inView] = useInView()

  const services = [
    {
      icon: <Brain size={28} />,
      title: 'Cognitive Behavioral Therapy',
      desc: 'CBT is a highly effective, evidence-based treatment that helps you identify and change negative thought patterns and behaviors contributing to emotional distress.',
    },
    {
      icon: <Heart size={28} />,
      title: 'EMDR & Trauma Therapy',
      desc: 'Eye Movement Desensitization and Reprocessing (EMDR) is an extensively researched methodology designed to alleviate the distress associated with traumatic memories.',
    },
    {
      icon: <Sparkles size={28} />,
      title: 'Mindfulness-Based Therapy',
      desc: 'Incorporating mindfulness techniques to reduce stress, manage anxiety, and improve emotional regulation by fostering present-moment awareness and acceptance.',
    },
    {
      icon: <Users size={28} />,
      title: 'Couples Counseling',
      desc: 'Using the Gottman Method and Emotionally Focused Therapy (EFT) to improve communication, resolve conflicts, and rebuild intimacy in relationships.',
    },
    {
      icon: <MessageCircle size={28} />,
      title: 'Psychodynamic Therapy',
      desc: 'Exploring how past experiences and unconscious processes influence your current behavior and relationships to foster deep self-awareness and lasting change.',
    },
    {
      icon: <BookOpen size={28} />,
      title: 'Acceptance & Commitment',
      desc: 'ACT focuses on psychological flexibility, helping you accept what is out of your personal control while committing to action that improves and enriches your life.',
    },
  ]

  return (
    <section id="specialties" ref={ref} className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-16 md:mb-20"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4D6D47] mb-4">Clinical Specialties</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-black leading-[1.1] mb-6 max-w-3xl">
            Evidence-based treatments<br />tailored to your needs.
          </h2>
          <p className="text-lg text-[#5A635A] leading-relaxed max-w-2xl font-medium">
            We specialize in scientifically validated psychological approaches to help you manage symptoms, build resilience, and improve your overall quality of life.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 25 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group p-8 rounded-3xl border border-[#F1F3F1] bg-[#FAFBF9] hover:bg-[#1C2E1E] transition-colors duration-500 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#EAECE9] group-hover:bg-[#2A4A2E] flex items-center justify-center text-[#1C2E1E] group-hover:text-white transition-colors duration-500 mb-6">
                {service.icon}
              </div>
              <h3 className="text-xl font-semibold text-black group-hover:text-white tracking-tight mb-3 transition-colors duration-500">
                {service.title}
              </h3>
              <p className="text-[#5A635A] group-hover:text-[#A8B8A8] leading-relaxed text-sm transition-colors duration-500 font-medium">
                {service.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────
   Section: Our Story (About)
   ────────────────────────────────────────────── */
function StorySection() {
  const [ref, inView] = useInView()

  const stats = [
    { number: '15+', label: 'Years Clinical Experience' },
    { number: 'Ph.D.', label: 'Clinical Psychology' },
    { number: 'NYS', label: 'Licensed Practitioner' },
    { number: '6', label: 'Specialized Modalities' },
  ]

  return (
    <section id="about" ref={ref} className="py-24 md:py-32 bg-[#FAFBF9]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4D6D47] mb-4">Meet Your Psychologist</p>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-black leading-[1.1] mb-8">
              Compassionate, <br />clinical expertise.
            </h2>
            <div className="space-y-5 text-[#5A635A] leading-relaxed font-medium">
              <p>
                Dr. Sarah Jenkins, Ph.D., is a licensed clinical psychologist currently practicing in New York. 
                With over 15 years of clinical experience, she specializes in the treatment of mood disorders, 
                anxiety, complex trauma, and relationship dynamics.
              </p>
              <p>
                Her practice focuses on delivering evidence-based treatments tailored to the unique psychological 
                profile of each patient. Dr. Jenkins integrates cognitive-behavioral principles with mindfulness 
                and psychodynamic insight, ensuring a comprehensive approach to mental health.
              </p>
              <p>
                She is currently accepting new patients for both short-term focused interventions and long-term 
                psychotherapy, prioritizing a safe, strictly confidential, and collaborative therapeutic environment.
              </p>
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#1C2E1E] flex items-center justify-center text-white text-xl font-semibold">
                SJ
              </div>
              <div>
                <p className="text-black font-semibold text-lg">Dr. Sarah Jenkins, Ph.D.</p>
                <p className="text-sm text-[#4D6D47] font-semibold">Licensed Clinical Psychologist</p>
              </div>
            </div>
          </motion.div>

          {/* Right: Stats */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <div className="grid grid-cols-2 gap-6">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                  className="p-8 rounded-3xl bg-white border border-[#F1F3F1] shadow-sm"
                >
                  <p className="text-4xl md:text-5xl font-bold text-[#1C2E1E] tracking-tight mb-2">
                    {stat.number}
                  </p>
                  <p className="text-sm font-semibold text-[#738273]">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="mt-6 p-8 rounded-3xl bg-[#1C2E1E] text-white shadow-md"
            >
              <p className="text-lg font-medium leading-relaxed italic mb-4">
                "Effective therapy is the integration of rigorous clinical science with deep, compassionate understanding of the human experience."
              </p>
              <p className="text-sm text-[#A8B8A8] font-semibold">— Dr. Sarah Jenkins</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────
   Section: Approach (Methodology)
   ────────────────────────────────────────────── */
function ApproachSection() {
  const [ref, inView] = useInView()

  const steps = [
    {
      number: '01',
      title: 'Comprehensive Evaluation',
      desc: 'The therapeutic process begins with a thorough clinical assessment. We evaluate your current symptoms, personal history, and psychosocial environment to establish an accurate diagnostic understanding and set concrete goals.',
      detail: 'Diagnostic Assessment · Goal Setting · Treatment Planning',
    },
    {
      number: '02',
      title: 'Evidence-Based Intervention',
      desc: 'Utilizing empirically supported modalities (such as CBT, EMDR, or ACT), we work systematically to address symptoms, alter maladaptive cognitive patterns, and develop effective coping strategies.',
      detail: 'Targeted Therapy · Skill Acquisition · Cognitive Restructuring',
    },
    {
      number: '03',
      title: 'Maintenance & Growth',
      desc: 'As acute symptoms diminish, the focus shifts to consolidating gains, preventing relapse, and fostering long-term psychological resilience and personal growth.',
      detail: 'Relapse Prevention · Resilience Building · Termination Planning',
    },
  ]

  return (
    <section id="approach" ref={ref} className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-16 md:mb-20 text-center"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4D6D47] mb-4">Treatment Philosophy</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-black leading-[1.1] mb-6">
            A structured path<br />to clinical wellness.
          </h2>
          <p className="text-lg text-[#5A635A] leading-relaxed max-w-2xl mx-auto font-medium">
            Our methodology adheres to the highest standards of psychological practice, ensuring that your treatment is structured, measurable, and effective.
          </p>
        </motion.div>

        <div className="space-y-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="group grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 md:p-12 rounded-3xl border border-[#F1F3F1] bg-[#FAFBF9] hover:bg-[#1C2E1E] transition-colors duration-500 shadow-sm"
            >
              <div className="lg:col-span-1">
                <span className="text-5xl md:text-6xl font-bold text-[#EAECE9] group-hover:text-[#2A4A2E] transition-colors duration-500 select-none">
                  {step.number}
                </span>
              </div>
              <div className="lg:col-span-4">
                <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-black group-hover:text-white mb-4 transition-colors duration-500">
                  {step.title}
                </h3>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#4D6D47] group-hover:text-[#6B8B6B] transition-colors duration-500">
                  {step.detail}
                </p>
              </div>
              <div className="lg:col-span-7">
                <p className="text-[#5A635A] group-hover:text-[#A8B8A8] leading-relaxed transition-colors duration-500 font-medium">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────
   Section: Journal (Articles)
   ────────────────────────────────────────────── */
function JournalSection() {
  const [ref, inView] = useInView()

  const articles = [
    {
      tag: 'Clinical Research',
      title: 'Efficacy of CBT in the Treatment of Generalized Anxiety Disorder',
      excerpt: 'A review of recent clinical studies demonstrating the long-term effectiveness of Cognitive Behavioral Therapy in managing acute anxiety symptoms.',
      readTime: '6 min read',
      date: 'June 2026',
    },
    {
      tag: 'Mental Health',
      title: 'Understanding the Neurobiology of Trauma and Recovery',
      excerpt: 'How trauma impacts brain chemistry and structure, and the physiological mechanisms behind treatments like EMDR.',
      readTime: '8 min read',
      date: 'May 2026',
    },
    {
      tag: 'Therapy Guidelines',
      title: 'What to Expect in Your First Psychological Evaluation',
      excerpt: 'Demystifying the intake process: an overview of diagnostic assessments, confidentiality, and establishing a treatment plan.',
      readTime: '5 min read',
      date: 'April 2026',
    },
    {
      tag: 'Wellbeing',
      title: 'The Role of Sleep Hygiene in Mood Regulation',
      excerpt: 'Clinical insights into how sleep disruption exacerbates depressive symptoms and practical interventions for establishing healthy circadian rhythms.',
      readTime: '4 min read',
      date: 'March 2026',
    },
  ]

  return (
    <section id="resources" ref={ref} className="py-24 md:py-32 bg-[#FAFBF9]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-16 md:mb-20 gap-6"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4D6D47] mb-4">Clinical Insights</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-black leading-[1.1]">
              Resources for<br />mental wellness.
            </h2>
          </div>
          <a
            href="#resources"
            className="text-[#1C2E1E] text-sm uppercase tracking-[0.15em] font-bold flex items-center gap-2 hover:opacity-60 transition-opacity"
          >
            View all publications <ArrowUpRight size={16} />
          </a>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((article, i) => (
            <motion.article
              key={article.title}
              initial={{ opacity: 0, y: 25 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group p-8 md:p-10 rounded-3xl bg-white border border-[#F1F3F1] hover:border-[#1C2E1E]/20 hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded-full bg-[#EAECE9] text-[#1C2E1E] text-xs font-bold">
                  {article.tag}
                </span>
                <span className="text-xs font-semibold text-[#738273]">{article.date}</span>
              </div>
              <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-black leading-snug mb-4 group-hover:text-[#1C2E1E] transition-colors">
                {article.title}
              </h3>
              <p className="text-[#5A635A] leading-relaxed text-sm mb-6 font-medium">
                {article.excerpt}
              </p>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#738273]">
                  <Clock size={13} /> {article.readTime}
                </span>
                <span className="text-[#1C2E1E] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ArrowUpRight size={18} />
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────
   Section: Connect (CTA + Contact)
   ────────────────────────────────────────────── */
function ConnectSection({ onOpenModal }) {
  const [ref, inView] = useInView()

  return (
    <section id="connect" ref={ref} className="py-24 md:py-32 bg-[#1C2E1E]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left: CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6B8B6B] mb-4">Patient Portal</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.1] mb-8">
              Schedule a<br />consultation.
            </h2>
            <p className="text-[#A8B8A8] leading-relaxed mb-10 max-w-lg font-medium">
              Dr. Jenkins is currently practicing and accepting new patients. Reach out to schedule an initial evaluation and discuss a personalized treatment plan.
            </p>

            <div className="space-y-5">
              <a href="mailto:appointments@drjenkins.clinic" className="flex items-center gap-4 text-white hover:text-[#A8B8A8] transition-colors group">
                <div className="w-12 h-12 rounded-2xl bg-[#2A4A2E] flex items-center justify-center group-hover:bg-[#3A5A3E] transition-colors">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#6B8B6B] uppercase tracking-wider">Email</p>
                  <p className="font-medium">appointments@drjenkins.clinic</p>
                </div>
              </a>
              <a href="tel:+1234567890" className="flex items-center gap-4 text-white hover:text-[#A8B8A8] transition-colors group">
                <div className="w-12 h-12 rounded-2xl bg-[#2A4A2E] flex items-center justify-center group-hover:bg-[#3A5A3E] transition-colors">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#6B8B6B] uppercase tracking-wider">Office Phone</p>
                  <p className="font-medium">+1 (555) 321-4567</p>
                </div>
              </a>
              <div className="flex items-center gap-4 text-white">
                <div className="w-12 h-12 rounded-2xl bg-[#2A4A2E] flex items-center justify-center">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#6B8B6B] uppercase tracking-wider">Location</p>
                  <p className="font-medium">Medical Arts Building<br />789 Park Ave, Suite 402, New York, NY</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Schedule */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="flex flex-col justify-between"
          >
            <div className="p-8 md:p-10 rounded-3xl bg-[#243E26] border border-[#2A4A2E] mb-6 shadow-lg">
              <h3 className="text-2xl font-semibold tracking-tight text-white mb-6">Clinical Hours</h3>
              <div className="space-y-4">
                {[
                  { day: 'Monday – Thursday', time: '8:00 AM – 6:00 PM' },
                  { day: 'Friday', time: '8:00 AM – 2:00 PM' },
                  { day: 'Saturday & Sunday', time: 'Closed' },
                ].map((slot) => (
                  <div key={slot.day} className="flex justify-between items-center py-3 border-b border-[#2A4A2E] last:border-0">
                    <span className="text-[#A8B8A8] font-medium">{slot.day}</span>
                    <span className="text-white font-semibold">{slot.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 md:p-10 rounded-3xl bg-[#243E26] border border-[#2A4A2E] shadow-lg">
              <h3 className="text-xl font-semibold tracking-tight text-white mb-3">Request an Appointment</h3>
              <p className="text-sm text-[#A8B8A8] mb-6 font-medium">
                New patients are encouraged to request a brief phone intake to ensure clinical fit prior to the first session.
              </p>
              <button onClick={onOpenModal} className="w-full py-4 rounded-2xl bg-white text-[#1C2E1E] font-bold hover:bg-[#EAECE9] transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm">
                Access Patient Portal <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────
   Component: Footer
   ────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="py-12 bg-[#141F15] border-t border-[#1C2E1E]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          {/* Logo & tagline */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl text-white font-semibold">Dr. Sarah Jenkins</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#4D6D47] ml-2 border border-[#4D6D47]/50 px-2 py-0.5 rounded-full">Ph.D.</span>
            </div>
            <p className="text-sm text-[#6B8B6B] max-w-sm font-medium">
              Evidence-based clinical psychology and psychotherapy. Providing professional, compassionate care for lasting change.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-[#A8B8A8] font-medium">
            <a href="#specialties" className="hover:text-white transition-colors">Specialties</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <a href="#approach" className="hover:text-white transition-colors">Approach</a>
            <a href="#resources" className="hover:text-white transition-colors">Resources</a>
            <a href="#connect" className="hover:text-white transition-colors">Patient Portal</a>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-[#1C2E1E] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs font-medium text-[#4A5A4A]">
            &copy; {new Date().getFullYear()} Dr. Sarah Jenkins, Clinical Psychologist. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs font-medium text-[#4A5A4A]">
            <a href="#" className="hover:text-[#A8B8A8] transition-colors">HIPAA Notice</a>
            <a href="#" className="hover:text-[#A8B8A8] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#A8B8A8] transition-colors">Crisis Resources</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ──────────────────────────────────────────────
   Component: AppointmentModal
   ────────────────────────────────────────────── */
function AppointmentModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1)

  useEffect(() => {
    if (isOpen) setStep(1)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden z-10"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-[#FAFBF9] hover:bg-[#EAECE9] text-[#1C2E1E] transition-colors z-20 cursor-pointer"
        >
          <X size={18} />
        </button>
        <div className="p-8 md:p-10">
          {step === 1 ? (
            <form
              onSubmit={(e) => { e.preventDefault(); setStep(2); }}
              className="flex flex-col gap-5"
            >
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-black mb-2">Request an Appointment</h3>
                <p className="text-[#5A635A] text-sm font-medium">Please provide your details and we will contact you to schedule.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#4D6D47]">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8B8A8]" />
                  <input required type="text" className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#FAFBF9] border border-[#F1F3F1] focus:outline-none focus:border-[#4D6D47] focus:ring-1 focus:ring-[#4D6D47] transition-all text-sm" placeholder="Jane Doe" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#4D6D47]">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8B8A8]" />
                  <input required type="email" className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#FAFBF9] border border-[#F1F3F1] focus:outline-none focus:border-[#4D6D47] focus:ring-1 focus:ring-[#4D6D47] transition-all text-sm" placeholder="jane@example.com" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#4D6D47]">Primary Interest</label>
                <select required defaultValue="" className="w-full px-4 py-3 rounded-xl bg-[#FAFBF9] border border-[#F1F3F1] focus:outline-none focus:border-[#4D6D47] focus:ring-1 focus:ring-[#4D6D47] transition-all text-sm cursor-pointer">
                  <option value="" disabled>Select a service</option>
                  <option value="anxiety">Anxiety & Stress</option>
                  <option value="depression">Depression</option>
                  <option value="trauma">Trauma & PTSD</option>
                  <option value="couples">Couples Therapy</option>
                  <option value="other">Other / Consultation</option>
                </select>
              </div>
              <button type="submit" className="mt-4 w-full py-3.5 rounded-xl bg-[#1C2E1E] text-white font-bold hover:bg-[#2A4A2E] transition-colors cursor-pointer shadow-md">
                Submit Request
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-6">
              <div className="w-16 h-16 rounded-full bg-[#EAECE9] flex items-center justify-center text-[#2A4A2E] mb-6">
                <Check size={32} />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-black mb-3">Request Received</h3>
              <p className="text-[#5A635A] leading-relaxed mb-8">
                Thank you for reaching out. We have received your appointment request and will contact you shortly to confirm a time for your initial evaluation.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-xl bg-[#FAFBF9] border border-[#F1F3F1] text-[#1C2E1E] font-bold hover:bg-[#EAECE9] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   Main App
   ────────────────────────────────────────────── */
function App() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { displayed, done } = useTypewriter(
    "evidence-based therapy\nfor lasting change.",
    38,
    600
  )

  return (
    <div className="relative bg-white text-neutral-900 font-sans selection:bg-[#EAECE9] selection:text-[#1C2E1E] antialiased overflow-x-hidden">
      {/* Navbar */}
      <Navbar onOpenModal={() => setIsModalOpen(true)} />

      {/* ── Hero Container ── */}
      <div className="relative flex flex-col lg:block min-h-screen w-full">
        {/* Background Frames */}
        <BackgroundFrames />

        {/* Hero Content Layer */}
        <div className="relative z-10 flex flex-col order-first lg:order-none w-full bg-white lg:bg-transparent pb-8 lg:pb-0 lg:min-h-screen">
          <main
            id="spade-hero"
            className="w-full max-w-7xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center mt-20 lg:mt-0"
          >
            {/* Headline with typewriter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-6xl lg:text-[76px] font-semibold tracking-tight text-black leading-[1.08] mb-8 select-none w-full whitespace-pre-wrap">
                {displayed}
                {!done && (
                  <span className="inline-block w-[2px] h-[1.1em] bg-black align-middle ml-[2px] animate-blink" />
                )}
              </h1>
            </motion.div>

            {/* Secondary description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <p className="text-lg md:text-xl text-[#5A635A] leading-relaxed font-medium mb-14 max-w-2xl">
                Comprehensive clinical care focused on evidence-based practices. Dr. Sarah Jenkins, Ph.D. is a licensed clinical psychologist currently practicing and accepting new patients for individual and couples therapy.
              </p>
            </motion.div>

            {/* Service pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <ServicePills onOpenModal={() => setIsModalOpen(true)} />
            </motion.div>
          </main>
        </div>
      </div>

      {/* ── Remaining Sections ── */}
      <div className="relative z-20 bg-white">
        <TherapySection />
        <StorySection />
        <ApproachSection />
        <JournalSection />
        <ConnectSection onOpenModal={() => setIsModalOpen(true)} />
        <Footer />
      </div>

      {/* Appointment Modal */}
      <AnimatePresence>
        <AppointmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </AnimatePresence>
    </div>
  )
}

export default App
