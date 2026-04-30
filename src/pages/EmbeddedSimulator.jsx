import React, { useEffect, useState, useRef } from 'react';
import { Stage, Layer, Text } from 'react-konva';
import { Link } from 'react-router-dom';
import { WokwiArduino, WokwiLED } from '../components/embedded/WokwiElements';

// Minimal Arduino Blink Hex (blinks pin 13 / PB5)
const BLINK_HEX = `
:100000000C9434000C9446000C9446000C9446008E
:100010000C9446000C9446000C9446000C94460060
:100020000C9446000C9446000C9446000C94460050
:100030000C9446000C9446000C9446000C94460040
:100040000C9456000C9446000C9446000C94460020
:100050000C9446000C9446000C9446000C94460010
:100060000C9446000C9446000000000024002700EC
:100070002A0000000000250028002B0000000000BE
:1000800023002600290000000000000000000000E6
:10009000000004040404040404040202020202025C
:1000A000030303030303010204081020408001028B
:1000B000040810200000000011241FBECFEFD8E0A1
:1000C000DEBFCDBF11E0A0E0B1E001C01D92A230D4
:1000D000B107E1F710E0A0E0B1E001C01D92A23001
:1000E000B107E1F700E00CBF02C007B600E00CBFD8
:1000F00008951F920F920FB60F9211242F933F9339
:100100008F939F93AF93BF93EF93FF93809100014D
:1001100090910101A0910201B091030130910401EC
:100120000196A11DB11D011C111C809300019093FA
:100130000101A0930201B0930301E0910401E450E7
:10014000FF4F80818E4F808381E080930401FF91D8
:10015000EF91BF91AF919F918F913F912F910F9074
:100160000FBE0F901F901895789484B5826084BD86
:1001700084B5816084BD85B5826085BD85B581600E
:1001800085BD0895112484B5816084BD85B582603C
:1001900085BD089582E08093C00088E08093C100FC
:1001A00086E08093C2005098589A08959C0181E0CA
:1001B00001C080E0FB0131969F01285F3F4F05908C
:1001C000F491E02DF02D0190F081E02DF02D019054
:1001D0008081882311F008958091C00085FF01C04F
:1001E00008959091C600982319F09091C6008091E4
:1001F000C60008958091C00087FF01C00895809163
:10020000C00085FFFCEF8091C600089508958F929B
:100210009F92AF92BF92CF92DF92EF92FF920F93A3
:100220001F93CF93DF9300D000D0C8013197F8014E
:1002300089819A81AB81BC810196A11DB11D89839F
:100240009A83AB83BC832B813C812030310518F421
:1002500021E020838181803011F4109280008091A4
:100260008000813088F08181823058F08181833075
:1002700028F081818430D0F3809180008F5F80936C
:100280008000B901B150A04008C0809180008F5F94
:1002900080938000B901B150A04001C0B8010F5F63
:1002A0001F4FBA016181728183819481C9010C94C1
:1002B0006500E9010C946500E115F10509F046C0FB
:1002C0008181823018F08181833050F38091800056
:1002D000815080938000B901B150A04033C0809100
:1002E0008000815080938000B901B150A0402CC01D
:1002F000B80101501040BA01618172818381948154
:10030000C9010C946500E9010C946500E115F105A8
:1003100009F017C08181823018F08181833050F3A2
:10032000809180008F5F80938000B901B150A04077
:1003300004C0809180008F5F80938000B901B15039
:10034000A040B8010F5F1F4F0F5F1F4FF901A491A5
:1003500080818A2329F0F901A49180818A2B808383
:1003600003C0F901A49180818A2780838B81882313
:1003700011F008958B818F7DF2019491892B8493CE
:1003800008950F900F501F40DF91CF911F910F91DB
:10039000FF90EF90DF90CF90BF90AF909F908F90B3
:1003A00008950000000000000000000000000000BB
:1003B00000000000000000000000000000000000AB
:1003C000000000000000000000000000000000009B
:1003D000000000000000000000000000000000008B
:0E03E00000000000000000000000000000000E
:0803EE0020A1000020A1000036
:1003F600CF93DF9300D000D0CDB7DEB7209709F408
:1004060001C0F6CF80E284B988E285B9E8EBE0E0B0
:10041600F0E02491119782E091E0019721F384B988
:10042600E8EBE0E0F0E02491119782E091E00197AF
:1004360021F3E2CFF894FFCF08950F900F501F409C
:04044600DF91CF91AE
:00000001FF
`.trim();

export default function EmbeddedSimulator() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [ledLit, setLedLit] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => {
    // Cleanup worker on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const toggleSimulation = () => {
    if (isSimulating) {
      // Stop
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'STOP' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
      setIsSimulating(false);
      setLedLit(false);
    } else {
      // Start
      workerRef.current = new Worker(new URL('../workers/avr.worker.js', import.meta.url), { type: 'module' });
      
      workerRef.current.onmessage = (e) => {
        const { type, pin, value } = e.data;
        if (type === 'PIN_STATE' && pin === 13) {
          setLedLit(value);
        }
      };

      workerRef.current.postMessage({ type: 'START', hex: BLINK_HEX });
      setIsSimulating(true);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: 'white' }}>
      {/* Header / Controls */}
      <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 'bold' }}>Embedded Simulator <span style={{ color: '#1890ff', fontSize: '1rem', marginLeft: '10px' }}>(POC)</span></h1>
          <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '0.9rem' }}>Running hardcoded AVR blink on Web Worker</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={toggleSimulation}
            style={{
              padding: '10px 20px',
              background: isSimulating ? '#ff4d4f' : '#52c41a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            {isSimulating ? 'Stop Simulation' : 'Start Simulation'}
          </button>
          <Link to="/" style={{ padding: '10px 20px', background: '#333', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>
            Exit
          </Link>
        </div>
      </div>

      {/* Canvas Area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Stage width={window.innerWidth} height={window.innerHeight - 80}>
          <Layer>
            {/* Background text or grid could go here */}
            <Text text="Simulation Canvas (No Grid)" x={20} y={20} fill="#555" fontSize={16} />

            {/* Arduino */}
            <WokwiArduino x={200} y={150} rotation={0} />

            {/* LED - Positioned to simulate connection to pin 13 and GND */}
            <WokwiLED x={450} y={200} rotation={0} lit={ledLit} color="blue" />
            
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
