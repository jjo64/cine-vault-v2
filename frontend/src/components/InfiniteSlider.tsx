import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Link } from 'react-router-dom';

import { createSlug } from '../utils/stringUtils';

interface Movie {
    id: number;
    title: string;
    poster_path: string;
    backdrop_path: string;
}

type SliderLoopConfig = {
    repeat?: number;
    paused?: boolean;
    speed?: number;
    paddingRight?: number;
    snap?: number | false;
    reversed?: boolean;
};

type SliderTimeline = gsap.core.Timeline & {
    next: (vars?: gsap.TweenVars) => gsap.core.Tween;
    previous: (vars?: gsap.TweenVars) => gsap.core.Tween;
    current: () => number;
    toIndex: (index: number, vars?: gsap.TweenVars) => gsap.core.Tween;
    times: number[];
};

const InfiniteSlider: React.FC = () => {
    const [movies, setMovies] = useState<Movie[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchPopular = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/movies/popular`);
                if (!res.ok) {
                    setMovies([]);
                    return;
                }
                const data = await res.json();
                const results = Array.isArray(data?.results) ? data.results : [];
                setMovies(results.slice(0, 10));
            } catch (error) {
                setMovies([]);
                console.error("Error fetching popular movies:", error);
            }
        };
        fetchPopular();
    }, []);

    useEffect(() => {
        if (movies.length === 0 || !wrapperRef.current) return;

        const boxes = gsap.utils.toArray<HTMLElement>('.slider-card');

        const loop = horizontalLoop(boxes, {
            paused: false,
            repeat: -1,
            speed: 0.5,
            paddingRight: 20
        });

        return () => {
            if (loop) loop.kill();
        };
    }, [movies]);

    return (
        <section className="infinite-slider-section" style={{ overflow: 'hidden', padding: '20px 0', background: 'transparent', maxWidth: '1000px', margin: '0 auto' }}>
            <div ref={containerRef} style={{ width: '100%', overflow: 'hidden', maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
                <div ref={wrapperRef} className="slider-wrapper" style={{ display: 'flex', gap: '20px', width: 'max-content' }}>
                    {movies.map((movie) => (
                        <Link key={movie.id} to={`/movie/${movie.id}-${createSlug(movie.title)}`} className="slider-card" style={{ flexShrink: 0, textDecoration: 'none', position: 'relative' }}>
                            <img
                                src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                                alt={movie.title}
                                loading="lazy"
                                width={180}
                                height={270}
                                style={{
                                    width: '180px',
                                    height: '270px',
                                    borderRadius: '8px',
                                    objectFit: 'cover',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                    transition: 'transform 0.3s ease',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                                onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.05, duration: 0.3 })}
                                onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.3 })}
                            />
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

// Helper function de GSAP para loops infinitos
// Ref: https://greensock.com/docs/v3/HelperFunctions#loop
function horizontalLoop(items: HTMLElement[] | string, config: SliderLoopConfig = {}): SliderTimeline {
    const elements = gsap.utils.toArray<HTMLElement>(items);
    const times: number[] = [];
    const widths: number[] = [];
    const xPercents: number[] = [];
    let curIndex = 0;
    const length = elements.length;
    const startX = elements[0].offsetLeft;
    const pixelsPerSecond = (config.speed || 1) * 100;
    const snap = config.snap === false ? (v: number) => v : gsap.utils.snap(config.snap || 1);

    const tl = gsap.timeline({
        repeat: config.repeat,
        paused: config.paused,
        defaults: { ease: 'none' },
        onReverseComplete: () => {
            tl.totalTime(tl.rawTime() + tl.duration() * 100);
        },
    }) as SliderTimeline;

    gsap.set(elements, { // convert "x" to "xPercent" to make things responsive, and populate arrays for faster lookup.
        xPercent: (i, el) => {
            const w = (widths[i] = parseFloat(gsap.getProperty(el, 'width', 'px') as string));
            xPercents[i] = snap(
                (parseFloat(gsap.getProperty(el, 'x', 'px') as string) / w) * 100 +
                parseFloat(gsap.getProperty(el, 'xPercent') as string)
            );
            return xPercents[i];
        }
    });
    gsap.set(elements, { x: 0 });

    const totalWidth =
        elements[length - 1].offsetLeft +
        (xPercents[length - 1] / 100) * widths[length - 1] -
        startX +
        elements[length - 1].offsetWidth * parseFloat(gsap.getProperty(elements[length - 1], 'scaleX') as string) +
        (config.paddingRight || 0);

    for (let i = 0; i < length; i++) {
        const item = elements[i];
        const curX = (xPercents[i] / 100) * widths[i];
        const distanceToStart = item.offsetLeft + curX - startX;
        const distanceToLoop = distanceToStart + widths[i] * parseFloat(gsap.getProperty(item, 'scaleX') as string);
        tl.to(item, { xPercent: snap((curX - distanceToLoop) / widths[i] * 100), duration: distanceToLoop / pixelsPerSecond }, 0)
            .fromTo(item, { xPercent: snap((curX - distanceToLoop + totalWidth) / widths[i] * 100) }, { xPercent: xPercents[i], duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond, immediateRender: false }, distanceToLoop / pixelsPerSecond)
            .add("label" + i, distanceToStart / pixelsPerSecond);
        times[i] = distanceToStart / pixelsPerSecond;
    }
    function toIndex(index: number, vars: gsap.TweenVars = {}) {
        if (Math.abs(index - curIndex) > length / 2) {
            index += index > curIndex ? -length : length;
        }
        const newIndex = gsap.utils.wrap(0, length, index);
        let time = times[newIndex];
        if (time > tl.time() !== index > curIndex) { // if we're wrapping the timeline's playhead, make the proper adjustments
            vars.modifiers = { time: gsap.utils.wrap(0, tl.duration()) };
            time += tl.duration() * (index > curIndex ? 1 : -1);
        }
        curIndex = newIndex;
        vars.overwrite = true;
        return tl.tweenTo(time, vars);
    }
    tl.next = (vars?: gsap.TweenVars) => toIndex(curIndex + 1, vars);
    tl.previous = (vars?: gsap.TweenVars) => toIndex(curIndex - 1, vars);
    tl.current = () => curIndex;
    tl.toIndex = (index: number, vars?: gsap.TweenVars) => toIndex(index, vars);
    tl.times = times;
    tl.progress(1, true).progress(0, true); // pre-render for performance
    if (config.reversed) {
        tl.vars.onReverseComplete?.();
        tl.reverse();
    }
    return tl;
}

export default InfiniteSlider;
