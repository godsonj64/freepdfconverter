import React from 'react';

export const MissionStatement: React.FC = () => {
  return (
    <section className="max-w-4xl mx-auto bg-white border border-[#b8b8b8] text-[#151515] rounded-[2vw] shadow-sm relative overflow-hidden flex flex-col">
      <div className="relative z-10 flex flex-col items-center text-center pt-12 sm:pt-16 px-6 sm:px-12 pb-10">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
          Why is this free?
        </h2>
        
        <div className="space-y-6 max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-[#474747] leading-relaxed font-medium">
          <p>
            <strong className="text-[#151515] font-bold">Axiomatic Research</strong> is a small, independent research lab. Our mission is to explore, engineer, and distribute high-quality software tools to as many people as possible—entirely for free.
          </p>
          <p>
            We operate under a simple, pragmatic philosophy: our tools remain free until our infrastructure scales beyond the generous free tiers provided by global server companies. Until we are forced to pay for extreme capacity, we absorb the overhead so you don't have to.
          </p>
          <p className="text-[#151515] italic font-bold pt-2">
            "We hope it stays this way for a very, very long time."
          </p>
        </div>
      </div>

      <div className="w-full mt-auto">
        <img 
          src="/vecteezy_teamwork-or-team-building-office-business-meeting-vector_4154417.jpg" 
          alt="Axiomatic Research Teamwork" 
          className="w-full h-auto max-h-[300px] sm:max-h-[400px] object-cover object-top"
        />
      </div>
    </section>
  );
};
