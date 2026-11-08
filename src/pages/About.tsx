import { Link } from "react-router-dom"
import { PageShell } from "@/components/Form"

// Copy as published on ometsey.com/about-us.
const STATEMENTS = [
    { title: "Our Mission", body: "Our mission is to empower women through timeless, sophisticated fashion that celebrates individuality, confidence, and strength. We are committed to creating high-quality, meticulously crafted garments that fuse classic elegance with modern style, enabling women to express their unique identity with grace and authenticity. Proudly rooted in Ghanaian craftsmanship, we aim to deliver an exceptional, personalized experience that inspires confidence and leaves a lasting impact." },
    { title: "Our Vision", body: "Our vision is to become a globally recognized fashion brand known for its impeccable design, sustainable practices, and dedication to empowering women. We strive to redefine modern African fashion by creating enduring, versatile pieces that transcend trends and stand the test of time, all while promoting ethical craftsmanship and local artistry. Through our designs, we aspire to inspire a new generation of confident, powerful women who lead with style and purpose." },
    { title: "Our Commitment", body: "OMETSEY is committed to excellence, not just in the quality of our garments, but in the experience we provide for every client. From the moment you engage with us, whether online or in person, we are dedicated to offering you a seamless, personalized, and memorable journey. We believe that fashion should not only be beautiful but also ethical and sustainable, which is why we prioritize using high-quality, locally sourced materials and supporting local artisans in every stage of production. Our commitment to sustainability extends beyond our designs—we believe in slow fashion and the importance of investing in pieces that last. Every OMETSEY garment is crafted with care and attention to detail, ensuring that it remains a timeless addition to your wardrobe for years to come." },
    { title: "The OMETSEY Woman", body: "The OMETSEY woman is more than just a fashionista—she is a trendsetter, a woman of substance, and a beacon of strength and confidence. She leads with her heart and her mind, making her mark on the world with every step she takes. OMETSEY celebrates this woman by providing clothing that complements her lifestyle, enhances her confidence, and underscores her elegance. We design for the woman who is unapologetically herself. She embraces her power, radiates positivity, and influences others through her grace and resilience. To be an OMETSEY woman is to embody strength, beauty, and sophistication." },
];

const WHY = [
    { title: "Our Philosophy", body: "We believe fashion is more than just clothing; it’s a form of self-expression, confidence, and power. Our philosophy centers around creating versatile, timeless pieces that not only elevate your wardrobe but also empower you to embrace your uniqueness. We design for the modern woman who values quality, elegance, and individuality." },
    { title: "Our Designs", body: "Our design aesthetic is rooted in clean, minimalist lines, impeccable tailoring, and unexpected details that give each piece a distinctive edge. From simple, elegant made-to-order garments to intricately designed bespoke creations, our pieces are crafted to be enduring staples in your wardrobe. We work with carefully selected fabrics and materials, ensuring every garment is not only beautiful but also durable and sustainable." },
    { title: "The Bespoke Experience", body: "For those looking for a more personalized touch, OMETSEY offers an exclusive bespoke service that provides a one-on-one design experience with our Creative Director, Darkwaa Edna. The bespoke process is a journey that begins with a personal consultation, either in person or virtually, where clients can share their vision and ideas for the perfect outfit or gown." },
];

const VALUES = [
    { title: "Empowerment", body: "We believe in empowering women through fashion that celebrates individuality, strength, and confidence, making each woman feel bold and unapologetically herself." },
    { title: "Timeless Elegance", body: "Our designs embody a blend of classic sophistication and modern edge, ensuring that each piece remains a versatile, enduring staple in every woman’s wardrobe." },
    { title: "Craftsmanship", body: "We are dedicated to the art of meticulous craftsmanship, using high-quality materials and precise tailoring to create garments that reflect excellence and attention to detail." },
    { title: "Sustainability", body: "We are committed to ethical and sustainable fashion practices, promoting the use of locally sourced materials and supporting slow fashion that respects both people and the environment." },
    { title: "Individuality", body: "We honor the uniqueness of every woman by offering personalized, bespoke fashion that reflects her distinct style, allowing her to express her identity with grace and originality." },
    { title: "Cultural Heritage", body: "Rooted in Ghanaian culture, we celebrate and preserve our rich African heritage through our designs, blending traditional artistry with contemporary fashion for a global audience." },
];

const heading = "text-[13px] uppercase tracking-[0.08em]";
const body = "text-[13px] leading-6 text-black/70";

export function About() {
    return (
        <PageShell title="About Us">
            <p className="mx-auto max-w-3xl text-center text-[14px] leading-7">
                Welcome to OMETSEY, a contemporary women’s fashion brand rooted in the vibrant culture of Ghana and designed for the confident, stylish woman of today. Founded in 2017 by Darkwaa Edna, OMETSEY offers a unique blend of classic sophistication and modern elegance, with a commitment to creating timeless pieces that empower women to express their personal style with confidence.
            </p>

            <div className="mt-16 grid items-center gap-10 md:grid-cols-2">
                <img src="/images/about/brand.jpg" alt="OMETSEY" className="mx-auto w-full max-w-[520px]" />
                <div className="mx-auto max-w-lg">
                    <h2 className="mb-5 text-[18px] uppercase">Our Story</h2>
                    <p className={body}>As someone who has always favored clean lines, timeless designs, and minimalistic sophistication, Edna sought to build a brand that reflects her belief that fashion is not just about what you wear, but how it makes you feel. Her love for fashion that combines simplicity with a slight edge inspired the foundation of OMETSEY—where every piece is a statement of strength, style, and elegance.</p>
                    <p className={`${body} mt-4`}>Proudly made in Ghana, our brand is deeply connected to our African roots, reflecting the rich cultural heritage of West Africa through the use of locally sourced fabrics and traditional craftsmanship. Each OMETSEY piece is a testament to the artistry and meticulous attention to detail that goes into every garment we create.</p>
                </div>
            </div>

            <div className="mx-auto mt-20 grid max-w-5xl gap-x-16 gap-y-12 md:grid-cols-2">
                {STATEMENTS.map((s) => (
                    <div key={s.title}>
                        <h2 className="mb-4 text-[18px] uppercase">{s.title}</h2>
                        <p className={body}>{s.body}</p>
                    </div>
                ))}
            </div>
            <div className="mt-10 text-center"><Link to="/collections/all" className="label ulink">Shop Now</Link></div>

            <h2 className="mb-10 mt-24 text-center text-[18px] uppercase">Why Choose Us</h2>
            <div className="grid gap-10 md:grid-cols-3">
                {WHY.map((w) => (
                    <div key={w.title} className="border border-line p-8">
                        <h3 className={`${heading} mb-4`}>{w.title}</h3>
                        <p className={body}>{w.body}</p>
                    </div>
                ))}
            </div>

            <h2 className="mb-10 mt-24 text-center text-[18px] uppercase">Our Core Values</h2>
            <div className="grid gap-x-10 gap-y-10 md:grid-cols-3">
                {VALUES.map((v) => (
                    <div key={v.title}>
                        <h3 className={`${heading} mb-3`}>{v.title}</h3>
                        <p className={body}>{v.body}</p>
                    </div>
                ))}
            </div>

            <div className="mt-24 flex flex-col items-center text-center">
                <h2 className="mb-8 text-[18px] uppercase">Meet Our Founder &amp; Creative Director</h2>
                <img src="/images/about/founder.png" alt="Darkwaa Edna" className="w-56" />
                <p className="mt-6 text-[14px] uppercase tracking-[0.08em]">Darkwaa Edna</p>
                <p className="mt-1 text-[12px] text-black/60">Founder / Creative Director</p>
            </div>
        </PageShell>
    );
}
