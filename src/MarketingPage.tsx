import React from "react";
import { Download, Eye, Sparkles, Gift, Coins, Trophy, Users, Layers, Star } from "lucide-react";

export default function MarketingPage({ onLogout }: { onLogout?: () => void }) {
  // 12 avatars representing the separated girls
  const testimonials = [
    { name: "प्रिया पाटील", location: "पुणे", reward: "₹१५० कॅशबॅक", type: "मॉडर्न लुक", img: "/assets/avatar_modern_1.jpg", text: "खरेदी केली आणि १० सेकंदात कॅशबॅक थेट बँक खात्यात जमा झाला!" },
    { name: "अंजली देशमुख", location: "मुंबई", reward: "स्मार्ट वॉच विजेती", type: "मॉडर्न लुक", img: "/assets/avatar_modern_2.jpg", text: "लकी ड्रॉ मध्ये उत्कृष्ट गिफ्ट मिळाले, विश्वासार्ह डिजिटल मंच आहे!" },
    { name: "स्नेहा जोशी", location: "नाशिक", reward: "₹५०० कूपन", type: "मॉडर्न लुक", img: "/assets/avatar_modern_3.jpg", text: "प्रत्येक खरेदीवर निश्चित बक्षीस मिळवून खरेदीचा आनंद द्विगुणित झाला." },
    { name: "किरण शिंदे", location: "कोल्हापूर", reward: "₹१०० कॅशबॅक", type: "मॉडर्न लुक", img: "/assets/avatar_modern_4.jpg", text: "वापरण्यास अत्यंत सोपे, फक्त क्यूआर स्कॅन करा आणि बक्षीस मिळवा!" },
    { name: "पूजा मोरे", location: "सांगली", reward: "गिफ्ट हॅम्पर", type: "मॉडर्न लुक", img: "/assets/avatar_modern_5.jpg", text: "उत्कृष्ट कस्टमर अनुभव! ExMudra ॲप खूपच उपयुक्त आहे." },
    { name: "तन्वी सावंत", location: "सोलापूर", reward: "₹२५० कॅशबॅक", type: "मॉर्न लुक", img: "/assets/avatar_modern_6.jpg", text: "माझ्या आवडत्या दुकानातून निश्चित डिस्काउंट कूपन मिळाले." },
    { name: "मीरा कुलकर्णी", location: "पुणे", reward: "₹५०० कॅशबॅक", type: "पारंपारिक लुक", img: "/assets/avatar_traditional_1.jpg", text: "दुकानात स्कॅन करण्याची सोय खूप छान आहे, लगेच कॅशबॅक मिळतो." },
    { name: "सविता जाधव", location: "सातारा", reward: "मिक्सर ग्राइंडर", type: "पारंपारिक लुक", img: "/assets/avatar_traditional_2.jpg", text: "लकी ड्रॉ मध्ये घरगुती वापराचे सुंदर गिफ्ट मिळाले, धन्यवाद!" },
    { name: "स्वाती घाडगे", location: "बारामती", reward: "₹१०० कूपन", type: "पारंपारिक लुक", img: "/assets/avatar_traditional_3.jpg", text: "नोंदणी मोफत आणि अतिशय सोपी आहे. प्रत्येक दुकानात स्कॅन व्हायला हवे!" },
    { name: "ऋतुजा काळे", location: "नागपूर", reward: "₹३०० कॅशबॅक", type: "पारंपारिक लुक", img: "/assets/avatar_traditional_4.jpg", text: "ॲप वरून सोप्या पद्धतीने पॉईंट्स जमा होतात आणि खरेदी स्वस्त पडते." },
    { name: "अर्चना पवार", location: "नांदेड", reward: "इस्त्री मशीन", type: "पारंपारिक लुक", img: "/assets/avatar_traditional_5.jpg", text: "ExMudra मुळे आम्हाला आमच्या खरेदीवर हमखास बचत होते." },
    { name: "लता गायकवाड", location: "औरंगाबाद", reward: "₹२०० कॅशबॅक", type: "पारंपारिक लुक", img: "/assets/avatar_traditional_6.jpg", text: "मोफत नोंदणी करून मला पहिल्याच स्कॅनवर विशेष गिफ्ट मिळाले!" }
  ];

  return (
    <div className="dashboard marathi-text" style={{ paddingBottom: "5rem", fontFamily: "'Noto Sans Marathi', sans-serif" }}>
      {onLogout && (
        <button 
          style={{ 
            float: "right", 
            margin: "0.5rem", 
            background: "rgba(239, 68, 68, 0.2)", 
            color: "#f87171",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            padding: "6px 12px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: "bold",
            transition: "all 0.3s ease"
          }}
          onClick={onLogout}
        >
          लॉगआउट ॲडमीन
        </button>
      )}

      {/* Hero Header */}
      <div className="surface" style={{ 
        position: "relative",
        background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)",
        border: "1px solid rgba(99, 102, 241, 0.2)",
        borderRadius: "24px",
        padding: "3rem 2rem",
        marginBottom: "2rem",
        overflow: "hidden"
      }}>
        <div style={{ position: "relative", zIndex: 2, maxWidth: "800px" }}>
          <span style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: "6px",
            background: "rgba(99, 102, 241, 0.2)", 
            color: "#a5b4fc", 
            padding: "6px 14px", 
            borderRadius: "9999px",
            fontSize: "0.85rem",
            fontWeight: 600,
            textTransform: "uppercase",
            marginBottom: "1.5rem"
          }}>
            <Sparkles size={14} /> ExMudra स्मार्ट QR
          </span>
          <h1 style={{ 
            fontSize: "3rem", 
            fontWeight: 800, 
            lineHeight: 1.15,
            background: "linear-gradient(to right, #ffffff, #c7d2fe)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "1rem"
          }}>
            खरेदी करा आणि बक्षीस जिंका!
          </h1>
          <p style={{ 
            fontSize: "1.2rem", 
            color: "var(--text-muted)", 
            lineHeight: 1.6, 
            marginBottom: "2rem" 
          }}>
            ग्राहकांना मोबाईलवर QR स्कॅन करून झटपट कॅशबॅक आणि लकी ड्रॉ जिंकण्याची संधी द्या. सोपे, जलद आणि १००% सुरक्षित!
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            <a 
              href="/deck.html" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="primary-action"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", fontSize: "1rem", padding: "0.75rem 1.5rem" }}
            >
              <Eye size={18} />
              सादरीकरण (Pitch Deck) पहा
            </a>
            <a 
              href="/assets/exmudra_marketing.pdf" 
              download="ExMudra_Marketing_Materials.pdf" 
              className="secondary-action"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", fontSize: "1rem", padding: "0.75rem 1.5rem" }}
            >
              <Download size={18} />
              विपणन (Marketing) PDF डाउनलोड करा
            </a>
          </div>
        </div>

        {/* Ambient glow */}
        <div style={{ 
          position: "absolute",
          top: "-50%",
          right: "-10%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)",
          zIndex: 1,
          pointerEvents: "none"
        }} />
      </div>

      {/* Main Split Features with Pink and Teal Promotional Banners */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "2rem", marginBottom: "3rem" }}>
        
        {/* Pink Top Girl Section */}
        <div className="surface" style={{ padding: "2rem", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "0.75rem", background: "rgba(219, 39, 119, 0.2)", color: "#fbcfe8", padding: "3px 8px", borderRadius: "4px", fontWeight: "bold" }}>ग्राहकांसाठी ऑफर</span>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0.5rem 0 1rem 0" }}>या खरेदीवर नक्की कॅशबॅक हवाय?</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "1rem" }}>
              बिलिंगच्या वेळी ग्राहकांना मोबाईल काढून ExMudra स्मार्ट QR कोड स्कॅन करण्यास सांगा जेणेकरून त्यांना फक्त १ सेकंदात झटपट बक्षीस मिळेल.
            </p>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.9rem", color: "var(--text-main)" }}>
              <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#db2777" }}>✔</span> १००% मोफत आणि सुरक्षित</li>
              <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#db2777" }}>✔</span> १ सेकंदात स्कॅन व बक्षीस</li>
            </ul>
          </div>
          <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
            <img src="/assets/promotional_pink.jpg" alt="Pink girl Scan Promo" style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
        </div>

        {/* Teal Top Girl Section */}
        <div className="surface" style={{ padding: "2rem", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "0.75rem", background: "rgba(13, 148, 136, 0.2)", color: "#ccfbf1", padding: "3px 8px", borderRadius: "4px", fontWeight: "bold" }}>दुकानदारांचे फायदे</span>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0.5rem 0 1rem 0" }}>आपल्या दुकानाची खास ओळख</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "1rem" }}>
              नवीन ग्राहकांची जलद नोंदणी करा, वारंवार होणाऱ्या खरेदीचा मागोवा घ्या आणि आपल्या दुकानाची ग्राहक निष्ठा सोप्या पद्धतीने वाढवा.
            </p>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.9rem", color: "var(--text-main)" }}>
              <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#0d9488" }}>✔</span> ग्राहक निष्ठा वाढवा</li>
              <li style={{ display: "flex", gap: "8px" }}><span style={{ color: "#0d9488" }}>✔</span> सुलभ डेटाबेस व्यवस्थापन</li>
            </ul>
          </div>
          <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
            <img src="/assets/promotional_teal.jpg" alt="Teal girl Scan Promo" style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
        </div>

      </div>

      {/* Grid of Core Concepts */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
        gap: "1.5rem",
        marginBottom: "3rem" 
      }}>
        {/* Card 1: Rewards */}
        <div className="surface" style={{ padding: "2rem" }}>
          <div style={{ 
            width: "48px", 
            height: "48px", 
            borderRadius: "12px", 
            background: "rgba(234, 179, 8, 0.15)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            color: "#facc15",
            marginBottom: "1.25rem"
          }}>
            <Gift size={24} />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>विविध बक्षीस प्रकार</h3>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.5, fontSize: "0.95rem" }}>
            विविध खरेदीदारांना आकर्षित करण्यासाठी कॅशबॅक, लकी ड्रॉ, डिस्काउंट कूपन आणि मोफत भेटवस्तू यांसारखे पर्याय उपलब्ध.
          </p>
        </div>

        {/* Card 2: Growth Strategy */}
        <div className="surface" style={{ padding: "2rem" }}>
          <div style={{ 
            width: "48px", 
            height: "48px", 
            borderRadius: "12px", 
            background: "rgba(34, 197, 94, 0.15)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            color: "#4ade80",
            marginBottom: "1.25rem"
          }}>
            <Layers size={24} />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>दुकानातील वाढीसाठी साधने</h3>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.5, fontSize: "0.95rem" }}>
            स्कॅनिंग वाढवण्यासाठी ७ सोपे मार्ग: काउंटरवर हुक बोर्ड, आकर्षक QR स्टँड, विजेत्यांची घोषणा आणि सणांमधील मोहिमा.
          </p>
        </div>

        {/* Card 3: Shop Benefits */}
        <div className="surface" style={{ padding: "2rem" }}>
          <div style={{ 
            width: "48px", 
            height: "48px", 
            borderRadius: "12px", 
            background: "rgba(99, 102, 241, 0.15)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            color: "#818cf8",
            marginBottom: "1.25rem"
          }}>
            <Users size={24} />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>व्यवसाय आणि सेटअप अंदाज</h3>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.5, fontSize: "0.95rem" }}>
            दुकानांना स्वतःचा ग्राहक डेटाबेस तयार करण्यासाठी आणि कमी खर्चात विक्री वाढवण्यासाठी सुलभ मासिक वर्गणी (₹१९९ - ₹४९९/महिना).
          </p>
        </div>
      </div>

      {/* Customer Avatars / Success Winners Section */}
      <div style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <Star size={24} style={{ color: "#facc15" }} />
          यशस्वी ग्राहक आणि विजेते (१२ सक्रिय सदस्य)
        </h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
          विविध भागातील समाधानी ग्राहक आणि त्यांना मिळालेल्या बक्षिसांची माहिती दर्शवणारी यादी.
        </p>

        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
          gap: "1.25rem" 
        }}>
          {testimonials.map((test, i) => (
            <div 
              key={i} 
              className="surface" 
              style={{ 
                padding: "1.25rem", 
                border: "1px solid rgba(255,255,255,0.06)", 
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                transition: "all 0.3s ease",
                cursor: "default"
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ 
                  width: "56px", 
                  height: "56px", 
                  borderRadius: "12px", 
                  overflow: "hidden", 
                  border: "2px solid rgba(99, 102, 241, 0.2)",
                  flexShrink: 0 
                }}>
                  <img src={test.img} alt={test.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div>
                  <h4 style={{ fontSize: "1rem", fontWeight: "bold", margin: 0 }}>{test.name}</h4>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{test.location}</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ 
                  fontSize: "0.75rem", 
                  padding: "3px 8px", 
                  borderRadius: "9999px", 
                  background: test.reward.includes("कॅशबॅक") ? "rgba(34, 197, 94, 0.15)" : "rgba(168, 85, 247, 0.15)",
                  color: test.reward.includes("कॅशबॅक") ? "#4ade80" : "#c084fc",
                  fontWeight: "bold"
                }}>
                  {test.reward}
                </span>
                <span style={{ 
                  fontSize: "0.75rem", 
                  color: test.type.includes("मॉडर्न") ? "#93c5fd" : "#fca5a5"
                }}>
                  {test.type}
                </span>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", lineHeight: 1.4 }}>
                "{test.text}"
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Content Section */}
      <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "1.5rem" }}>मुख्य प्रकल्प अहवाल आणि विश्लेषण</h2>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "2rem" }}>
        
        {/* Visual 1: Project Report */}
        <div className="surface" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ borderRadius: "12px", overflow: "hidden", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <img 
              src="/assets/project_report.jpg" 
              alt="Project Report overview" 
              style={{ width: "100%", height: "auto", display: "block", objectFit: "contain", maxHeight: "400px" }}
            />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", background: "rgba(168, 85, 247, 0.2)", color: "#f3e8ff", padding: "3px 8px", borderRadius: "4px", fontWeight: "bold" }}>व्यवसाय अहवाल</span>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0.5rem 0 0.25rem 0" }}>ExMudra व्यवसाय आणि प्रकल्प अहवाल</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.4 }}>
              फेज १ आणि फेज २ मधील उद्दिष्टे, महसूल अंदाज, सेटअप फी रचना आणि वाढीच्या योजनेचा सविस्तर अहवाल.
            </p>
          </div>
        </div>

        {/* Visual 2: Onboarding Target */}
        <div className="surface" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ borderRadius: "12px", overflow: "hidden", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <img 
              src="/assets/onboarding_campaign.jpg" 
              alt="Onboarding campaign poster" 
              style={{ width: "100%", height: "auto", display: "block", objectFit: "contain", maxHeight: "400px" }}
            />
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", background: "rgba(34, 197, 94, 0.2)", color: "#dcfce7", padding: "3px 8px", borderRadius: "4px", fontWeight: "bold" }}>मोहीम पोस्टर</span>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0.5rem 0 0.25rem 0" }}>१० दुकाने आणि १०० ग्राहक मोहीम</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.4 }}>
              ऑनबोर्डिंग मोहिमेची रूपरेषा, ग्राहक नोंदणीचे टप्पे आणि लकी ड्रॉ मधील भेटवस्तूंची माहिती देणारा मराठी फलक.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
