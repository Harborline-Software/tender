// App — Engine Room is locked. The studio shows a single, high-resolution
// preview of Variant D · Telegraph Bridge (the only menu layout going
// forward), wrapped in either macOS or Windows chrome. Below the studio
// sit the five settings popups and The Mark hero + size card.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mode": "dark",
  "os": "mac"
}/*EDITMODE-END*/;

const PALETTE_ID = 'engine-room';
const ICON_ID    = 'tm-fleur';

function StudioTweaks({ tweaks, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Theme">
        <TweakRadio
          label="Mode"
          value={tweaks.mode}
          options={[
            { label: 'Dark',  value: 'dark'  },
            { label: 'Light', value: 'light' },
          ]}
          onChange={(v) => setTweak('mode', v)}
        />
      </TweakSection>
      <TweakSection label="Operating System">
        <TweakRadio
          label="Chrome"
          value={tweaks.os}
          options={[
            { label: 'macOS',   value: 'mac' },
            { label: 'Windows', value: 'win' },
          ]}
          onChange={(v) => setTweak('os', v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

// Re-renders any 620×720 desktop artboard at 2× the natural size. The
// content authors at native CSS pixel sizes; the browser re-rasterizes
// on the transform so text stays crisp when the canvas is zoomed in.
function HiResStage({ width = 620, height = 720, scale = 2, children }) {
  return (
    <div style={{
      width: width * scale, height: height * scale,
      overflow:'hidden', position:'relative',
    }}>
      <div style={{
        width, height,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}>
        {children}
      </div>
    </div>
  );
}

function SettingsScreenArtboard({ screenId, mode = 'dark', os = 'mac' }) {
  const palette = THEME_PALETTES.find(p => p.id === PALETTE_ID) || THEME_PALETTES[0];
  const theme = getTheme(PALETTE_ID, mode);
  const Screen = (window.DETAIL_SCREENS || {})[screenId];
  return (
    <HiResStage width={420} height={720}>
      <LiveDesktop theme={theme} palette={palette} icon={ICON_ID} os={os} mode={mode}>
        {Screen ? <Screen theme={theme} palette={palette} icon={ICON_ID} onBack={() => {}}/> : null}
      </LiveDesktop>
    </HiResStage>
  );
}

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  return (
    <React.Fragment>
      <StudioTweaks tweaks={tweaks} setTweak={setTweak}/>

      <DesignCanvas>
        <DCSection id="studio"
                   title="Studio"
                   subtitle="Live preview · Telegraph Bridge · 2× resolution. Toggle dark/light + macOS/Windows chrome from the Tweaks panel. The dropdown is interactive — click the gear or any gauge / row to drill in.">
          <DCArtboard id="live"
                      label={`Live · D · Telegraph · ${tweaks.os === 'win' ? 'Windows 11' : 'macOS'} · ${tweaks.mode} · interactive · 2×`}
                      width={1240} height={1440}>
            <HiResStage>
              <StudioStage paletteId={PALETTE_ID} mode={tweaks.mode} icon={ICON_ID} os={tweaks.os}/>
            </HiResStage>
          </DCArtboard>
        </DCSection>

        <DCSection id="os-frames"
                   title="OS frames · same theme, two platforms"
                   subtitle="Same Telegraph menu, same fleur tray icon — wrapped in macOS and Windows 11 chrome. On macOS the dropdown hangs DOWN from the icon in the top menu bar; on Windows 11 it pops UP from the icon in the bottom system tray.">
          <DCArtboard id="os-mac" label="macOS · top menu bar · fleur tray icon top-right" width={1240} height={1440}>
            <HiResStage>
              <LivePreview paletteId={PALETTE_ID} mode={tweaks.mode} icon={ICON_ID} variant="D" os="mac"/>
            </HiResStage>
          </DCArtboard>
          <DCArtboard id="os-win" label="Windows 11 · bottom taskbar · fleur in system tray" width={1240} height={1440}>
            <HiResStage>
              <LivePreview paletteId={PALETTE_ID} mode={tweaks.mode} icon={ICON_ID} variant="D" os="win"/>
            </HiResStage>
          </DCArtboard>
        </DCSection>

        <DCSection id="settings"
                   title="Settings · gear popover screens"
                   subtitle="Five popups reached from the gear in the Telegraph header. Same Engine Room vocabulary as the live menu; the top-right pill is swapped from the live 334 counter to a Lucide cog so the surface reads as settings, not telemetry.">
          <DCArtboard id="set-about"   label="About Tender · brand plate + spec sheet"  width={840} height={1440}>
            <SettingsScreenArtboard screenId="about" mode={tweaks.mode} os={tweaks.os}/>
          </DCArtboard>
          <DCArtboard id="set-faq"     label="Bosun's Log · collapsible FAQ"            width={840} height={1440}>
            <SettingsScreenArtboard screenId="faq" mode={tweaks.mode} os={tweaks.os}/>
          </DCArtboard>
          <DCArtboard id="set-plugins" label="Cargo Hold · installed plugins + toggles" width={840} height={1440}>
            <SettingsScreenArtboard screenId="plugins" mode={tweaks.mode} os={tweaks.os}/>
          </DCArtboard>
          <DCArtboard id="set-proxy"   label="Proxy Wiring · mode + host/port + test"   width={840} height={1440}>
            <SettingsScreenArtboard screenId="proxy" mode={tweaks.mode} os={tweaks.os}/>
          </DCArtboard>
          <DCArtboard id="set-account" label="Quarterdeck · account + active sessions"  width={840} height={1440}>
            <SettingsScreenArtboard screenId="account" mode={tweaks.mode} os={tweaks.os}/>
          </DCArtboard>
        </DCSection>

        <DCSection id="the-mark"
                   title="The Mark"
                   subtitle="Engine Room fleur — the locked tray icon. Hero brand plate + size ladder.">
          <DCArtboard id="mark-hero" label="Hero · brand plate" width={560} height={420}>
            <FleurMarkHero/>
          </DCArtboard>
          <DCArtboard id="mark-sizes" label="Sizes · 12 → 64 px" width={520} height={420}>
            <FleurMarkSizeCard/>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
