import type { Metadata } from "next";
import ArticleShell from "@/components/work-samples/ArticleShell";

export const metadata: Metadata = {
  title: "An Analysis of Apple Immersive Video — DJ Lee",
  description:
    "Techniques, challenges, and best practices for filming Apple Immersive Video. Covering medium fundamentals, human factors, directing grammar, and production lifecycle.",
};

export default function AppleImmersiveVideoPage() {
  return (
    <ArticleShell title={<>
        {/* Title block */}
        <div className="mb-12">
          <h1 className="text-[32px] md:text-[40px] font-semibold text-[var(--color-text-primary)] tracking-[-0.03em] leading-tight">
            An Analysis of Apple Immersive Video
          </h1>
          <p className="text-[18px] md:text-[20px] text-[var(--color-text-secondary)] mt-3 leading-relaxed">
            Techniques, Challenges, and Best Practices
          </p>
          <p className="text-[14px] text-[var(--color-text-muted)] mt-4">
            Dong Jae Lee
          </p>
          <p className="text-[14px] text-[var(--color-text-tertiary)] italic mt-4 leading-relaxed border-l-2 border-[var(--color-border-tertiary)] pl-4">
            TL;DR — Apple Immersive Video isn&apos;t a new camera format — it&apos;s a new medium with its own grammar, and most directing rules from flat film don&apos;t apply.
          </p>
        </div>

    </>}>
        {/* Prose body */}
        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:tracking-[-0.02em] prose-h2:text-[24px] prose-h2:mt-14 prose-h2:mb-4 prose-h3:text-[18px] prose-h3:mt-10 prose-h3:mb-3 prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-[var(--color-text-secondary)] prose-li:text-[15px] prose-li:leading-relaxed prose-li:text-[var(--color-text-secondary)] prose-strong:text-[var(--color-text-primary)] prose-th:text-[14px] prose-td:text-[14px]">

          {/* Introduction */}
          <h2>Introduction: A New Medium, A New Authorship</h2>
          <p>
            Apple Immersive Video is not a wider lens on the same art form; it is a new medium with new
            authorship. Traditional cinema places meaning inside a rectangle and controls attention
            through framing and edits. Apple Immersive Video places the audience itself — head and
            all — inside the world. With ~23 million rendered pixels, 180&deg; stereoscopic 3D at 8K
            and 90 fps, and precise Spatial Audio, the format aims for &ldquo;fidelity of
            presence.&rdquo; But presence is not guaranteed by specifications alone. It must be
            designed — around physiology as much as aesthetics — so that the viewer feels embodied in
            the story rather than merely observing it.
          </p>
          <p>
            In this grammar, the camera is the viewer&rsquo;s body. The director no longer
            &ldquo;chooses the frame&rdquo; so much as chooses where the viewer exists. The task
            shifts from composing pictures to placing a presence and then guiding that presence with
            sound, performance, and light — always within the limits of human comfort. Break the
            medium&rsquo;s rules, and immersion collapses into strain. Respect them, and the work
            becomes viscerally real.
          </p>

          <hr />

          {/* Section 1 */}
          <h2>1) Medium Fundamentals: What Makes Apple Immersive Video Different</h2>
          <ul>
            <li>
              <strong>Format &amp; Capability:</strong> The technical foundation is a 180&deg;
              stereoscopic 3D video, captured at an 8K resolution and presented to the viewer at 90
              frames per second with Spatial Audio. This specification is designed to approach the
              fidelity of human visual and auditory perception, creating the necessary conditions for
              a high <strong>fidelity of presence</strong>.
            </li>
            <li>
              <strong>Core Shift: Placing a Body, Not Framing a Rectangle:</strong> The most
              significant change is philosophical. The filmmaker is no longer composing a 2D
              rectangle; they are choosing the <strong>viewer&rsquo;s head position</strong> in a 3D
              world. The role shifts from pixel-level control of a frame to the design of a world and
              the selection of a compelling vantage point within it.
            </li>
            <li>
              <strong>Implications for Craft:</strong> This core shift has immediate, cascading
              effects on the craft of filmmaking:
              <ul>
                <li>
                  <strong>The viewer owns gaze:</strong> The director can only <strong>guide</strong>{" "}
                  attention using cues like spatial audio, actor eyelines, and staging. They can no
                  longer enforce it with a cut or a zoom.
                </li>
                <li>
                  <strong>Sets must be complete:</strong> The environment must hold up to scrutiny
                  across the entire frontal hemisphere. The concept of &ldquo;just off-frame&rdquo;
                  barely exists.
                </li>
                <li>
                  <strong>Physiology dictates aesthetics:</strong> Editing and camera motion must
                  adhere to the limits of human perception. A jump cut is not just a change of scene;
                  it reads like a physical teleportation, which can be jarring and break immersion.
                </li>
              </ul>
            </li>
          </ul>

          <hr />

          {/* Section 2 */}
          <h2>2) Human Factors First: Perception, Comfort, and Failure Modes</h2>
          <p>
            Perceptual realities directly shape the creative rules of Apple Immersive Video.
            Designing against them causes viewer fatigue, discomfort, and a broken sense of presence.
          </p>

          <h3>2.1 Perceptual Realities</h3>
          <ul>
            <li>
              <strong>Unnatural Focus:</strong> The capture process bakes in a fixed focus plane. The
              Blackmagic URSA Cine Immersive is optimized for sharpness from approximately{" "}
              <strong>1 meter</strong> and beyond. The Vision Pro&rsquo;s foveated rendering sharpens
              the part of the display you are looking at but{" "}
              <strong>cannot change the recorded focus</strong> of the original video.
            </li>
            <li>
              <strong>&ldquo;Goggles Edge&rdquo; &amp; Periphery:</strong> A subtle framed or
              &ldquo;scuba mask&rdquo; feeling; minor warping or a fall-off in detail at the extreme
              edges of vision. The Vision Pro&rsquo;s Field of View is less than the full human FoV.
            </li>
            <li>
              <strong>Fragile Depth Illusion:</strong> While technically stereoscopic, the world can
              occasionally feel like a high-quality diorama rather than a fully embodied space. Some
              brains may resist a full depth inference from flat micro-OLED panels very close to the
              eyes.
            </li>
            <li>
              <strong>Ergonomics &amp; Session Length:</strong> Noticeable pressure on the cheeks and
              nose; a general preference for shorter viewing sessions of around{" "}
              <strong>10&ndash;20 minutes</strong>. The front-heavy mass of the Vision Pro
              (~600&ndash;650 g) creates physical strain over time, compounded by the cognitive load
              of processing a sustained stereoscopic image.
            </li>
            <li>
              <strong>The Isolation Effect:</strong> The inability to perform a casual glance at a
              phone or watch without completely breaking the sense of presence. The content must
              continuously earn the viewer&rsquo;s undivided attention.
            </li>
          </ul>

          <h3>2.2 Discomfort Vectors (Root Causes and Mitigations)</h3>
          <ul>
            <li>
              <strong>Motion Mismatch:</strong> Fast pans, lateral &ldquo;drive-by&rdquo; shots, and
              sudden accelerations create a conflict between what the eyes see and what the inner ear
              feels. <em>Mitigation:</em> Anchor the camera whenever possible. If movement is
              required, it must be <strong>slow, linear, predictable,</strong> and strongly motivated
              by the narrative.
            </li>
            <li>
              <strong>Vergence &amp; Proximity:</strong> Faces or objects closer than{" "}
              <strong>1.5 meters</strong> can cause eye strain (vergence-accommodation conflict).{" "}
              <em>Mitigation:</em> Block actors for a natural interpersonal distance of{" "}
              <strong>1.5&ndash;2.0 meters</strong>. Stage intimacy through co-presence and
              performance, not invasive proximity.
            </li>
            <li>
              <strong>Horizon &amp; Orientation:</strong> A tilted horizon or a cut that changes the
              viewer&rsquo;s heading can be intensely disorienting. <em>Mitigation:</em> Keep the
              horizon locked and level. Preserve heading across cuts or change it gradually.
            </li>
            <li>
              <strong>Peripheral Overload:</strong> High-energy action near the 180&deg; edges can
              fracture attention. <em>Mitigation:</em> Stage primary story beats within the
              comfortable <strong>frontal 90&ndash;120&deg; arc</strong>. Use audio cues to steer the
              gaze towards important off-center events.
            </li>
          </ul>

          <hr />

          {/* Section 3 */}
          <h2>3) Storycraft Rewritten: Directing Grammar for Apple Immersive Video</h2>
          <p>
            The following table outlines the fundamental shifts in technique required when moving from
            traditional 2D filmmaking to creating for Apple Immersive Video.
          </p>

          <div className="overflow-x-auto -mx-2">
            <table>
              <thead>
                <tr>
                  <th>Technique</th>
                  <th>Traditional 2D Film</th>
                  <th>Apple Immersive Video</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Filmmaker&rsquo;s Role</strong></td>
                  <td>
                    The director is a master of the frame, meticulously composing every shot to
                    control what the viewer sees.
                  </td>
                  <td>
                    The director chooses the viewer&rsquo;s head position in the world, shifting the
                    role from composing pictures to placing a presence.
                  </td>
                </tr>
                <tr>
                  <td><strong>Framing &amp; Composition</strong></td>
                  <td>
                    Absolute control using close-ups, wide shots, and rack focus to guide the
                    audience&rsquo;s eye.
                  </td>
                  <td>
                    The director loses precise frame control. Crucial story elements can be missed if
                    not placed centrally or guided by sound and light.
                  </td>
                </tr>
                <tr>
                  <td><strong>Camera Movement</strong></td>
                  <td>
                    A wide range of movements (pans, tilts, dollies, shaky-cam) convey emotion and
                    action.
                  </td>
                  <td>
                    The camera should be anchored at human head height. Motion should be minimal,
                    slow, linear, and motivated to avoid motion sickness.
                  </td>
                </tr>
                <tr>
                  <td><strong>Editing &amp; Rhythm</strong></td>
                  <td>
                    Rapid cuts build energy and control narrative pace. &ldquo;Invisible cuts&rdquo;
                    maintain seamless flow.
                  </td>
                  <td>
                    Rapid cutting is jarring and disorienting. Longer takes are favored to allow the
                    viewer to exist in a scene and explore it.
                  </td>
                </tr>
                <tr>
                  <td><strong>Lighting &amp; Set Design</strong></td>
                  <td>
                    Crew, lights, and equipment are hidden &ldquo;off-camera,&rdquo; just outside the
                    boundaries of the frame.
                  </td>
                  <td>
                    There is no &ldquo;off-camera&rdquo; in the frontal 180&deg; view. Lighting must
                    be practical or placed behind the camera. The entire scene must be dressed and
                    choreographed.
                  </td>
                </tr>
                <tr>
                  <td><strong>Proximity &amp; Scale</strong></td>
                  <td>
                    Close-ups are a primary tool for creating intimacy and magnifying emotional
                    impact.
                  </td>
                  <td>
                    Faces closer than ~1.5 m feel invasive and cause eye strain. Intimacy arises from
                    sharing a space, not from extreme close-ups.
                  </td>
                </tr>
                <tr>
                  <td><strong>Performance &amp; Direction</strong></td>
                  <td>
                    Performances are often captured in fragments and assembled in the edit. Actors can
                    &ldquo;cheat&rdquo; their eyelines to the camera.
                  </td>
                  <td>
                    The actor&rsquo;s entire body language is visible, requiring a flawless,
                    head-to-toe performance. Brief, direct eye contact can be powerful but must be
                    carefully calibrated.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>Additional Directing Principles</h3>
          <ul>
            <li>
              <strong>The Primacy of Perspective:</strong> Your default position should be an{" "}
              <strong>anchored, eye-level</strong> vantage point. Moving the camera is equivalent to
              moving the audience&rsquo;s body and should only be done when the story value outweighs
              the comfort cost.
            </li>
            <li>
              <strong>Designing for Attention:</strong> Because the viewer has complete agency to look
              anywhere, replace traditional tools like rack focus with more subtle techniques:{" "}
              <strong>
                spatial audio cues, actor eyelines, dialogue timing, and motivated light or movement
              </strong>
              .
            </li>
            <li>
              <strong>The Law of Continuity (Spatial &amp; Focal):</strong>
              <ul>
                <li>
                  <strong>Spatial Continuity:</strong> Maintain a consistent horizon, camera height,
                  and heading across edits. Use character blocking or slow, deliberate transitions to
                  guide the viewer.
                </li>
                <li>
                  <strong>Focal Point Continuity:</strong> When cutting between scenes, the primary
                  subject of the new scene should appear in a{" "}
                  <strong>similar location</strong> as the subject of the previous scene.
                </li>
              </ul>
            </li>
            <li>
              <strong>The Intimacy of Total Performance:</strong> Unlike traditional film which uses
              close-ups to direct focus, Apple Immersive Video presents the actor&rsquo;s entire body
              within the scene. The viewer is free to observe everything, creating a new level of
              emotional experience. The acting must be authentic from head to toe.
            </li>
          </ul>

          <hr />

          {/* Section 4 */}
          <h2>4) Production Lifecycle Playbook</h2>
          <p>
            This is a decision-to-delivery pipeline designed to build presence and comfort into every
            stage of production.
          </p>

          <h3>4.1 Project Fit (Decision Tree)</h3>
          <p>
            Apple Immersive Video is most advantageous when the story&rsquo;s value derives from{" "}
            <strong>co-presence, intimacy, or spatial awe</strong> (e.g., being in a rehearsal room,
            a cockpit vantage, or on-field during a sporting event). Avoid Apple Immersive Video for
            concepts that depend on{" "}
            <strong>rapid montage, macro close-ups, or kinetic lateral travel</strong>.
          </p>

          <h3>4.2 Pre-production</h3>
          <ul>
            <li>
              <strong>Headset-in-Loop Previz:</strong> Block scenes in a game engine (Unreal, Unity)
              and review them in a Vision Pro. This allows you to validate vantage points, map
              attention paths, and test the <strong>comfort budget</strong> before committing
              resources to a physical shoot.
            </li>
            <li>
              <strong>Shot &amp; Set Planning:</strong> Favor stable vantage points. Stage primary
              action within the <strong>90&ndash;120&deg;</strong> frontal arc. Dress the set
              completely — including ceilings, floors, and corners — to withstand scrutiny.
            </li>
            <li>
              <strong>Lighting Strategy:</strong> The combination of a 90 fps shutter and a fixed{" "}
              <strong>f/4 iris</strong> on the capture system demands significantly more light. For
              bright exteriors, plan for Neutral Density (ND) filters up to{" "}
              <strong>~8 stops</strong>. Design practicals that can genuinely and motivationally light
              the talent.
            </li>
            <li>
              <strong>Crew &amp; Footprint:</strong> Meticulously map where crew and equipment can
              exist <strong>behind</strong> the camera&rsquo;s 180&deg; field of view. Plan for
              reflection control on all surfaces.
            </li>
          </ul>

          <h3>4.3 Capture</h3>
          <ul>
            <li>
              <strong>Vantage &amp; Height:</strong> Place the camera at a{" "}
              <strong>natural eye level</strong> unless a different perspective is strongly motivated
              by the story.
            </li>
            <li>
              <strong>Motion Policy:</strong> Motivate all movement with story logic. Keep speed low
              and the path linear, avoiding lateral accelerations at all costs.
            </li>
            <li>
              <strong>Optics &amp; Exposure:</strong> Actively manage flares and reflections. Protect
              skin tones from highlight clipping. Keep the horizon true and level.
            </li>
            <li>
              <strong>Spatial Audio:</strong> Record with positional intent. Think of sound as a tool
              to lay <strong>sonic breadcrumbs</strong> that steer the viewer&rsquo;s gaze, such as
              off-screen footsteps or instrument cues.
            </li>
            <li>
              <strong>Specialized Rigs:</strong> Use high-end gear like the{" "}
              <strong>ShotOver K1</strong> for aerials, <strong>clean dollies,</strong> and{" "}
              <strong>underwater rigs</strong> only to secure a stable, awe-giving vantage — not to
              add artificial kinetic thrill.
            </li>
          </ul>

          <h3>4.4 Post-production</h3>
          <ul>
            <li>
              <strong>Stereo &amp; Horizon QA:</strong> Meticulously check for and correct any
              vertical disparity between the left and right eye images. Ensure horizon continuity
              across all edits.
            </li>
            <li>
              <strong>Comfort-Preserving Edit:</strong> Audit the frequency of cuts and changes in
              heading. Prefer dissolves and motivated reframes over hard cuts.
            </li>
            <li>
              <strong>Spatial Mix:</strong> Align audio cues precisely with the intended attention
              path. Avoid dissonant or distracting off-screen sounds that don&rsquo;t serve the
              narrative.
            </li>
            <li>
              <strong>Color &amp; Finish:</strong> Favor natural contrast and saturation levels to
              reduce eye fatigue over long viewing periods.
            </li>
            <li>
              <strong>Hybrid Deliverables:</strong> Plan for 2D derivatives early in the process.
              Consider framing, crops, and alternative audio mixes to{" "}
              <strong>maximize ROI</strong> from the immersive shoot.
            </li>
          </ul>

          <h3>4.5 QC &amp; Comfort Testing</h3>
          <ul>
            <li>
              <strong>Headset Reviews with Naive Viewers:</strong> The most crucial step. Log any
              moments that cause discomfort and correlate them with proximity, motion, or cuts in the
              edit.
            </li>
            <li>
              <strong>Session Design Validation:</strong> Confirm that the{" "}
              <strong>5&ndash;15 minute</strong> emotional arc is effective. For longer stories,
              insert chapter breaks or moments of calm to allow viewers to reset.
            </li>
          </ul>

          <hr />

          {/* Section 5 */}
          <h2>5) Experience Design: Session, Onboarding, and Context</h2>
          <ul>
            <li>
              <strong>Session Architecture:</strong> Design for <strong>short arcs</strong> with a
              clear emotional cadence. For longer works, chapterize the experience with soft
              transitions to give the viewer a break.
            </li>
            <li>
              <strong>Onboarding:</strong> Start calm. Allow the viewer a moment to establish their
              new horizon and environment. Introduce motion or complex action only after they are
              oriented.
            </li>
            <li>
              <strong>Pacing &amp; Breathers:</strong> Intentionally include low-stimulus moments in
              the narrative to act as &ldquo;breathers&rdquo; and reset the viewer&rsquo;s comfort
              level.
            </li>
            <li>
              <strong>Hybrid Form Factors:</strong> Consider{" "}
              <strong>immersive &harr; 2D transitions</strong> where they can add narrative clarity or
              reduce production cost. Ensure that immersive shots are composed in a way that allows
              them to be gracefully repurposed for 2D.
            </li>
            <li>
              <strong>Accessibility:</strong> Design subtitles to be legible and comfortably placed in
              a 3D space. Implement clear audio descriptions. Consider offering comfort-mode
              alternatives for viewers who are particularly sensitive to motion.
            </li>
          </ul>
        </div>
    </ArticleShell>
  );
}
