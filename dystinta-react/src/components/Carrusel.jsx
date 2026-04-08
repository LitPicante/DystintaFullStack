import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import video1Fallback from "../assets/video1.mp4";
import video2Fallback from "../assets/video2.mp4";
import video3Fallback from "../assets/video3.mp4";

export default function Carrusel({ captions }) {
  const [current, setCurrent] = useState(0);
  const [remoteMedia, setRemoteMedia] = useState([]);
  const fallback = useMemo(() => [video1Fallback, video2Fallback, video3Fallback], []);

  useEffect(() => {
    let mounted = true;

    async function loadMedia() {
      try {
        const { data } = await api.get("/media/home-carousel/");
        if (mounted) setRemoteMedia(Array.isArray(data) ? data : []);
      } catch (error) {
        if (mounted) setRemoteMedia([]);
      }
    }

    loadMedia();
    return () => {
      mounted = false;
    };
  }, []);

  const slides = useMemo(() => {
    const map = new Map(remoteMedia.map((item) => [item.slot, item]));
    return [
      { src: map.get(1)?.file || fallback[0], caption: captions?.video1 || "" },
      { src: map.get(2)?.file || fallback[1], caption: captions?.video2 || "" },
      { src: map.get(3)?.file || fallback[2], caption: captions?.video3 || "" },
    ];
  }, [remoteMedia, fallback, captions]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="home-carousel-band">
      <div className="home-stage home-stage-wide">
        <div className="home-stage-top">
          <span className="badge">Carrusel destacado</span>
          <p className="hint">Presentación visual de procesos y servicios.</p>
        </div>

        <div className="video-carousel video-carousel-home video-carousel-banner">
          {slides.map((slide, index) => (
            <div key={`${slide.caption}-${index}`} className={`video-slide${index === current ? " active" : ""}`}>
              <video
                className="video-media"
                autoPlay={index === current}
                muted
                loop
                playsInline
                preload="metadata"
                src={slide.src}
              />
              <div className="video-caption" data-video-caption={String(index + 1)}>
                {slide.caption}
              </div>
            </div>
          ))}
        </div>

        <div className="carousel-controls carousel-controls-wide carousel-controls-banner">
          <button
            id="prevSlide"
            className="btn soft small"
            type="button"
            onClick={() => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)}
          >
            Anterior
          </button>
          <button
            id="nextSlide"
            className="btn small"
            type="button"
            onClick={() => setCurrent((prev) => (prev + 1) % slides.length)}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
