import Color from 'color';
import { useState } from 'react';
import { Box, Card, ColorPicker, Popover, TextField } from '@shopify/polaris';

export function ColorField({ color, setColor }: { color: Color; setColor: (color: Color) => void }) {
  const [active, setActive] = useState(false);
  const [textFieldValue, setTextFieldValue] = useState(color.hex());

  return (
    <>
      <Popover
        active={active}
        activator={
          <TextField
            label={'Color'}
            autoComplete="off"
            value={textFieldValue}
            onFocus={() => setActive(true)}
            onChange={value => {
              setTextFieldValue(value);

              try {
                setColor(Color(value));
              } catch (e) {}
            }}
            requiredIndicator
            connectedLeft={
              <Box paddingInlineEnd="100">
                <div
                  style={{
                    width: '1.8em',
                    height: '1.8em',
                    backgroundColor: color.hex(),
                    borderRadius: '0.3em',
                  }}
                ></div>
              </Box>
            }
          />
        }
        onClose={() => setActive(false)}
        preferredPosition="below"
        preferredAlignment="left"
      >
        <Card>
          <ColorPicker
            color={{
              hue: color.hue(),
              saturation: color.saturationv() / 100,
              brightness: color.value() / 100,
            }}
            onChange={color => {
              const newColor = Color.hsv(color.hue, color.saturation * 100, color.brightness * 100);
              setColor(newColor);
              setTextFieldValue(newColor.hex());
            }}
          />
        </Card>
      </Popover>
    </>
  );
}
