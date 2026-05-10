import { IconMoon, IconSun } from '@tabler/icons-react';
import { ActionIcon, Group, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import classes from './ActionToggle.module.css';

export function ActionToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });

  return (
    <Group justify="center">
      <ActionIcon
        onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
        variant="default"
        size="l"
        radius="s"
        aria-label="Toggle color scheme"
      >
        { computedColorScheme === "light"
          ? <IconMoon className={classes.icon} stroke={1.0} />
          : <IconSun className={classes.icon} stroke={1.0} />
        }
        
      </ActionIcon>
    </Group>
  );
}

export default ActionToggle;